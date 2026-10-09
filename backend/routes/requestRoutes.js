const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const commentController = require("../controllers/commentController");
const aiController = require("../controllers/aiController");
const { auth, adminOnly } = require("../middleware/auth");

// Stats must be registered before /:id parameter route
router.get("/stats", auth, requestController.getStats);

// Ticket list & creation
router.get("/", auth, requestController.getRequests);
router.post("/", auth, requestController.createRequest);

// Specific ticket operations
router.get("/:id", auth, requestController.getRequestById);
router.patch("/:id/status", auth, adminOnly, requestController.updateStatus);
router.delete("/:id", auth, adminOnly, requestController.deleteRequest);

// Ticket comments / threading
router.get("/:id/comments", auth, commentController.getComments);
router.post("/:id/comments", auth, commentController.addComment);

// AI suggestion & summarization
router.post("/:id/ai-suggest", auth, aiController.generateAiSuggestion);

module.exports = router;
