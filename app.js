var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var multer = require('multer');
var axios = require('axios');
var fs = require('fs');
const cors = require("cors");
const dotenv = require("dotenv");
var FormData = require('form-data');
const pdfParse = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { PDFDocument } = require("pdf-lib");
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

var indexRouter = require('./routes/index');


var app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// ------------------ MULTER SETUP ------------------
const upload = multer({ dest: path.join(__dirname, "uploads") });

// ------------------ RESUME UPLOAD ROUTE (POST) ------------------
app.post("/ResumeEnhancer", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) 
      return res.status(400).json({ error: "No resume uploaded" });

    const filePath = path.join(__dirname, "uploads", req.file.filename);
    const mime = req.file.mimetype;

    let resumeText = "";

    // ---------------------- PDF Extract ----------------------
    if (mime === "application/pdf") {
      console.log("PDF detected");

      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = new Uint8Array(pdfBuffer);

      // load PDF
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      let textContent = "";

      // extract all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const strings = content.items.map(item => item.str).join(" ");
        textContent += strings + "\n";
      }

      resumeText = textContent;
    }

    // ---------------------- DOCX Extract ----------------------
    else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword"
    ) {
      console.log("DOCX detected");

      const mammoth = require("mammoth");
      const docBuffer = fs.readFileSync(filePath);

      const result = await mammoth.extractRawText({ buffer: docBuffer });
      resumeText = result.value;
    }

    // ---------------------- EMPTY TEXT CHECK ----------------------
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        error: "Unable to extract text from file",
        mime: mime,
      });
    }

    // ---------------------- SEND TO N8N ----------------------
    const N8N_WEBHOOK = "https://manju-1984.app.n8n.cloud/webhook-test/ResumeEnhancer";

    const response = await axios.post(N8N_WEBHOOK, {
      resume: resumeText,
      filename: req.file.originalname,
    });

    console.log("Sent to N8N:", response.data);

    res.json({
      success: true,
      message: "Resume processed & text sent to n8n!",
      textLength: resumeText.length,
    });

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});




// ------------------ AI COVER LETTER ROUTE (POST) ------------------
app.post("/AiCoverletter", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No resume uploaded" });

    const filePath = path.join(__dirname, "uploads", req.file.filename);
    const mime = req.file.mimetype;

    let resumeText = "";

    // ---------------------- PDF Extract ----------------------
    if (mime === "application/pdf") {
      console.log("PDF detected (Cover Letter)");

      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = new Uint8Array(pdfBuffer);

      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

      let textContent = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const strings = content.items.map(item => item.str).join(" ");
        textContent += strings + "\n";
      }

      resumeText = textContent;
    }

    // ---------------------- DOCX Extract ----------------------
    else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword"
    ) {
      console.log("DOCX detected (Cover Letter)");

      const mammoth = require("mammoth");
      const docBuffer = fs.readFileSync(filePath);

      const result = await mammoth.extractRawText({ buffer: docBuffer });
      resumeText = result.value;
    }

    // ---------------------- EMPTY TEXT CHECK ----------------------
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        error: "Unable to extract text from file",
        mime: mime,
      });
    }

    // ---------------------- SEND TO N8N ----------------------
    const N8N_WEBHOOK = "https://manju-1984.app.n8n.cloud/webhook-test/AiCoverletter";

    const response = await axios.post(N8N_WEBHOOK, {
      resume: resumeText,
      filename: req.file.originalname,
    });

    console.log("Cover Letter data sent to N8N:", response.data);

    res.json({
      success: true,
      message: "Cover Letter resume processed & sent to n8n!",
      textLength: resumeText.length,
    });

  } catch (err) {
    console.error("Cover Letter Server Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



app.post("/cityjobs", async (req, res) => {
  try {
    const { city, role } = req.body;

    if (!city || !role) {
      return res.status(400).json({ success: false, error: "City and Role are required" });
    }

    // Adzuna API Setup
    const country = "in"; // India
    const what = role === "All" ? "" : encodeURIComponent(role);
    const where = encodeURIComponent(city);

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=30&what=${what}&where=${where}&content-type=application/json`;

    const response = await axios.get(url);
    const jobsData = response.data.results || [];

    const jobs = jobsData.map((job, index) => ({
      id: index + 1,
      title: job.title,
      city: job.location.display_name,
      link: job.redirect_url
    }));

    res.json({ success: true, jobs });

  } catch (err) {
    console.error("CITYJOBS ROUTE ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
});



// Fallback resources
const RESOURCE_MAP = {
  "React": [
    "https://reactjs.org/tutorial/tutorial.html",
    "https://www.udemy.com/course/react-redux/"
  ],
  "TypeScript": [
    "https://www.typescriptlang.org/docs/",
    "https://www.udemy.com/course/typescript/"
  ],
  "CSS Grid/Flexbox": [
    "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout",
    "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout"
  ]
};

// Extract text from PDF buffer
async function extractPdfText(buffer) {
  const pdfDoc = await PDFDocument.load(buffer);
  let text = "";
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    if (page.getTextContent) {
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(" ") + "\n";
    }
  }

  return text || "Resume text unreadable or skipped.";
}

// ===============================
//  API Endpoint (POST)
// ===============================
app.post("/api/resource-suggestions", upload.single("resume"), async (req, res) => {
  try {
    const targetRole = req.body.targetRole?.trim();
    if (!targetRole) {
      return res.status(400).json({ error: "Target role missing" });
    }

    if (!req.file || req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Upload a valid PDF file" });
    }

    let fileText;
    try {
      fileText = await extractPdfText(req.file.buffer);
    } catch (err) {
      console.warn("⚠️ PDF extraction failed.");
      fileText = "Resume text unreadable or skipped.";
    }

    const prompt = `
You are an expert career advisor.
Analyze the candidate's resume for the role: ${targetRole}.
Extract skills and list 5–10 missing important skills.

IMPORTANT — Return ONLY JSON:
{
  "missingSkills": ["skill1","skill2"],
  "resources": {
    "skill1": ["URL"],
    "skill2": ["URL"]
  }
}

Resume text:
${fileText}
`;

    // Gemini call
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const raw = result.response.text();
    console.log("RAW GEMINI OUTPUT:", raw);

    let data;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      data = JSON.parse(jsonMatch[0]);

      if (!data.missingSkills) data.missingSkills = [];
      if (!data.resources) data.resources = {};

      for (const skill of data.missingSkills) {
        if (!data.resources[skill]) {
          data.resources[skill] = RESOURCE_MAP[skill] || [];
        } else if (!Array.isArray(data.resources[skill])) {
          data.resources[skill] = [data.resources[skill]];
        }

        data.resources[skill] = data.resources[skill].map(link => {
          link = link.trim();
          if (!/^https?:\/\//i.test(link)) {
            return "https://" + link.replace(/\s/g, "");
          }
          return link;
        });
      }
    } catch (err) {
      console.error("❌ JSON Parsing Error:", err);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    res.json(data);

  } catch (err) {
    console.error("❌ Backend Error:", err);
    res.status(500).json({ error: "Backend error", details: err.message });
  }
});



app.post("/score", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    const extractedText = pdfData.text;

    console.log(
      "Extracted PDF text (first 250 chars):",
      extractedText.slice(0, 250)
    );

    const prompt = `
You are a professional resume evaluator. Analyze the resume and return a strictly valid JSON object ONLY. 
Do NOT include any text outside JSON.

The JSON object must contain:
{
  "ATSScore": number,
  "WordSuggestions": [
      {
        "Current": string,
        "Suggested": string
      }
  ]
}

Instructions:
- Always provide at least 10 word/phrase suggestions in "WordSuggestions".
- Focus on improving phrasing, impact, and relevance for job applications.
- If the resume is short, creatively enhance phrases to reach 10 suggestions.
- Do NOT include comments, markdown, or extra text outside JSON.

Resume:
${extractedText}
`;

    const result = await model.generateContent(prompt);
    let outputText = result.response.text().trim();

    // Remove backticks if model wraps json in ```json ... ```
    outputText = outputText
      .replace(/^```json\s*/, "")
      .replace(/```$/, "")
      .trim();

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (jsonMatch) outputText = jsonMatch[0];
    else outputText = "{}";

    let jsonResult;
    try {
      jsonResult = JSON.parse(outputText);
    } catch (e) {
      console.error("Failed to parse AI JSON:", outputText);
      jsonResult = {
        ATSScore: 0,
        WordSuggestions: [],
      };
    }

    fs.unlinkSync(req.file.path);

    console.log("Sending JSON to frontend:", jsonResult);
    res.json(jsonResult);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({
      error: "AI processing failed",
      details: error.message,
    });
  }
});




// ------------------ VIEW ENGINE ------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// ------------------ ROUTERS ------------------
app.use('/', indexRouter);

// catch 404 and forward to error handler

app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
