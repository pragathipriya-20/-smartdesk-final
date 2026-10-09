const { db } = require("../db");

// Rule-based fallback engine for when OPENAI_API_KEY is not supplied
function generateRuleBasedAI(ticket) {
  const { customer, subject, description, category, priority } = ticket;
  const firstName = (customer || "Customer").split(" ")[0];

  let summary = "";
  let triageSteps = [];
  let responseDraft = "";

  const descPreview = description ? description.replace(/\s+/g, " ").trim() : "";

  switch (category) {
    case "Technical Issue":
      summary = `Customer reports technical glitch with "${subject}". Problem summary: "${descPreview}".`;
      triageSteps = [
        "Inspect application error logs and frontend console diagnostics around the incident timestamp.",
        "Check browser compatibility, cache/cookie state, and recent client-side release deployments.",
        "Attempt reproduction in the staging environment using equivalent user role permissions."
      ];
      responseDraft = `Hi ${firstName},\n\nThank you for reaching out to SmartDesk Support. We have received your technical report regarding "${subject}".\n\nOur engineering team is actively investigating the error. In the meantime, could you please confirm if this issue persists in an incognito window or after clearing your browser cache?\n\nWe will update you as soon as our diagnostics are complete.\n\nBest regards,\nSmartDesk Technical Support Team`;
      break;

    case "Account Issue":
      summary = `Authentication or account management difficulty regarding "${subject}". Details: "${descPreview}".`;
      triageSteps = [
        "Audit user authentication records in security audit log for failed login attempts or 2FA lockouts.",
        "Verify email verification status and single sign-on (SSO) federation bindings.",
        "Ensure user permission role mappings are correctly provisioned in database."
      ];
      responseDraft = `Hello ${firstName},\n\nThank you for contacting SmartDesk. We understand you are experiencing an account issue with "${subject}".\n\nTo ensure your account security, we have initiated a credential verification check. Please check your inbox for an authorization link or reply to this ticket if you need your two-factor device reset.\n\nWe appreciate your patience while we secure your access.\n\nWarm regards,\nSmartDesk Account Security Team`;
      break;

    case "Payment Issue":
      summary = `Billing/transaction discrepancy reported for "${subject}". Details: "${descPreview}".`;
      triageSteps = [
        "Cross-reference customer email and transaction ID against payment gateway dashboard.",
        "Check bank/UPI settlement webhooks for any failed, refunded, or pending status events.",
        "If payment succeeded but service is unfulfilled, trigger manual order activation."
      ];
      responseDraft = `Dear ${firstName},\n\nThank you for bringing this payment inquiry to our attention regarding "${subject}".\n\nWe take billing inquiries very seriously. Our finance operations desk is currently reconciling your transaction with our payment gateway. If funds were deducted, please rest assured that your service will be credited or a full refund will be processed promptly.\n\nSincerely,\nSmartDesk Billing Operations`;
      break;

    case "Delivery Issue":
      summary = `Fulfillment or tracking concern regarding "${subject}". Details: "${descPreview}".`;
      triageSteps = [
        "Verify carrier dispatch tracking ID and API status feed.",
        "Check dispatch hub location and expected estimated delivery date.",
        "Confirm delivery address provided matches shipping manifest."
      ];
      responseDraft = `Hi ${firstName},\n\nThank you for checking in on the delivery status for "${subject}".\n\nWe have contacted our logistics dispatch partner to get real-time tracking coordinates for your parcel. We will send you an updated tracking link and estimated arrival time within the next few hours.\n\nBest regards,\nSmartDesk Logistics Desk`;
      break;

    default:
      summary = `Customer inquiry regarding "${subject}" [${priority} priority]. Details: "${descPreview}".`;
      triageSteps = [
        "Review ticket context and determine appropriate specialist team.",
        "Verify customer account SLA tier and response deadline.",
        "Respond with initial acknowledgment and estimated turnaround time."
      ];
      responseDraft = `Hello ${firstName},\n\nThank you for reaching out to SmartDesk Support regarding "${subject}".\n\nYour request has been routed to our specialist team. We are currently evaluating the details you provided and will follow up with next steps shortly.\n\nThank you for choosing SmartDesk!\n\nBest regards,\nSmartDesk Customer Experience`;
      break;
  }

  const triageText = triageSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n");
  const fullSuggestions = `### Recommended Triage Steps:\n${triageText}\n\n### Suggested Customer Response:\n${responseDraft}`;

  return { summary, suggestions: fullSuggestions };
}

// Optional OpenAI integration with graceful fallback
async function callOpenAI(ticket) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are an elite customer support operations AI. Analyze this customer support ticket:
Customer: ${ticket.customer} (${ticket.email})
Category: ${ticket.category}
Priority: ${ticket.priority}
Subject: ${ticket.subject}
Description: ${ticket.description}

Provide a JSON response with:
1. "summary": A concise 1-2 sentence executive summary of the problem.
2. "triage": Array of 3 specific technical/operational action steps to investigate.
3. "responseDraft": A courteous, professional customer support email response addressing the customer by first name.

Return pure JSON without markdown wrappers.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    const triageFormatted = (parsed.triage || []).map((t, idx) => `${idx + 1}. ${t}`).join("\n");
    const suggestions = `### Recommended Triage Steps:\n${triageFormatted}\n\n### Suggested Customer Response:\n${parsed.responseDraft}`;

    return {
      summary: parsed.summary,
      suggestions
    };
  } catch (err) {
    console.warn("OpenAI API call failed, falling back to built-in rules:", err.message);
    return null;
  }
}

exports.generateAiSuggestion = async (req, res) => {
  const requestId = Number(req.params.id);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid ticket ID." });

  const ticket = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  // Check access permissions
  if (req.user.role !== "admin" && ticket.user_id !== req.user.id && ticket.email !== req.user.email) {
    return res.status(403).json({ message: "Access denied to this ticket." });
  }

  // Generate either via OpenAI or built-in intelligent engine
  let result = await callOpenAI(ticket);
  if (!result) {
    result = generateRuleBasedAI(ticket);
  }

  // Save to database
  db.prepare(`
    UPDATE requests
    SET ai_summary = ?, ai_suggestions = ?
    WHERE id = ?
  `).run(result.summary, result.suggestions, requestId);

  const updatedTicket = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);

  res.json({
    message: "AI analysis and response suggestion generated successfully.",
    ai_summary: result.summary,
    ai_suggestions: result.suggestions,
    ticket: updatedTicket
  });
};
