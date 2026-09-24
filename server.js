const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AI Student Innovation Assistant backend is running."
    });
});

// AI generation endpoint
app.post("/api/generate", async (req, res) => {
    try {
        const {
            topic,
            type,
            language
        } = req.body;

        if (!topic || !topic.trim()) {
            return res.status(400).json({
                success: false,
                error: "Please enter a project topic."
            });
        }

        if (!process.env.LLM_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "LLM_API_KEY is missing in the .env file."
            });
        }

        const selectedType = type || "Project Ideas";
        const selectedLanguage = language || "English";

        const systemPrompt = `
You are an AI Student Innovation Assistant.

Your job is to help college students develop academic and technology projects.

Give practical, beginner-friendly, technically accurate answers.

The student may ask for:
- Project ideas
- Problem statements
- Objectives
- Technology stack
- PPT points
- Viva questions
- Project descriptions

Use clear headings and bullet points.

Avoid unnecessarily complicated terminology.

The answer should be suitable for a college student project presentation.

Do not claim that an AI-generated idea is guaranteed to work.
`;

        const userPrompt = `
Project Topic:
${topic.trim()}

Requested Output:
${selectedType}

Language:
${selectedLanguage}

Generate the requested content.

For project ideas:
Give 5 useful project ideas with a short explanation.

For a problem statement:
Give a clear problem statement, existing problem, proposed solution and expected benefit.

For objectives:
Give 5-8 clear objectives.

For technology stack:
Give frontend, backend, database, AI/ML and other relevant technologies, with a short reason for each.

For PPT points:
Give structured points suitable for presentation slides such as:
Introduction, Problem Statement, Objectives, Existing System, Proposed System,
Technology Stack, Methodology, Features, Advantages, Future Scope and Conclusion.

For viva questions:
Give 15 common viva questions and simple answers.

Make the response directly useful for a college project.
`;

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LLM_API_KEY}`
            },
            body: JSON.stringify({
                model: process.env.LLM_MODEL || "gpt-5.6-mini",
                instructions: systemPrompt,
                input: userPrompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("LLM API error:", data);

            return res.status(response.status).json({
                success: false,
                error:
                    data?.error?.message ||
                    "The AI service returned an error."
            });
        }

        // Responses API normally provides output_text.
        // This fallback also handles structured output if necessary.
        let answer = data.output_text || "";

        if (!answer && Array.isArray(data.output)) {
            answer = data.output
                .flatMap(item => item.content || [])
                .filter(item => item.type === "output_text")
                .map(item => item.text)
                .join("\n");
        }

        if (!answer) {
            return res.status(500).json({
                success: false,
                error: "The AI returned an empty response."
            });
        }

        res.json({
            success: true,
            answer: answer
        });

    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to connect to the AI service."
        });
    }
});

// Send index.html for the main page
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log("");
    console.log("==============================================");
    console.log(" AI Student Innovation Assistant");
    console.log("==============================================");
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log("");
});
