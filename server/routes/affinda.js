const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { AffindaAPI, AffindaCredential } = require("@affinda/affinda");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const credential = new AffindaCredential(
  "aff_0b5dd5d16de4100f7660c3c8d0f9f14641080d4c"
); // Replace this
const client = new AffindaAPI(credential);

router.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const file = fs.createReadStream(filePath);

    const parsedDoc = await client.createDocument({
      file,
      workspace: "LcOpHLRi", // optional
    });

    fs.unlinkSync(filePath); // delete uploaded file

    return res.json(parsedDoc.data);
  } catch (error) {
    console.error("Affinda Error:", error);
    return res.status(500).json({ error: "Resume parsing failed" });
  }
});

module.exports = router;
