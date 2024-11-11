const UserLearningPlanModel = require('../db.js').UserLearningPlanModel;
const openai = require('openai');

exports.getOrCreateLearningPlan = async (req, res) => {
    const userId = req.session.userId;
    const scoreParam = req.query.results;
    const quizType = req.query.quizType; // Assuming quizType is passed in the query parameters
    let score;

    // Set `score` from the parameter if provided, otherwise from the last plan
    if (scoreParam) {
        score = parseInt(scoreParam);
        if (isNaN(score)) {
            console.error("Score (results) parameter is invalid.");
            return res.status(400).send("Score must be a valid number.");
        }
    } else {
        // If `results` isn't specified, find the user's last learning plan
        const lastPlan = await UserLearningPlanModel.findOne({ user: userId }).sort({ score: -1 });
        score = lastPlan ? lastPlan.score : 0; // Default to 0 for new users without a plan
    }

    try {
        console.log("Searching for learning plan with user ID:", userId, "score:", score, "and quizType:", quizType);

        // Search for an existing learning plan based on `score`
        let learningPlan = await UserLearningPlanModel.findOne({ user: userId, score: score });

        if (!learningPlan) {
            console.log("Creating a new learning plan for user:", userId);

            // Set different learning steps based on quizType
            let steps;
            switch (quizType) {
                case 'cpp':
                    steps = [
                        { topic: "Variables and Data Types", description: "Review C++ data types.", recommendedTime: "1.5 hours", advice: "Understand differences between types like int, float, etc." },
                        { topic: "Control Structures", description: "Master conditional statements and loops in C++.", recommendedTime: "2 hours", advice: "Practice `if`, `for`, `while` loops." },
                        { topic: "Functions and Scope", description: "Learn function creation and scope in C++.", recommendedTime: "1.5 hours", advice: "Focus on parameter passing and scope." },
                        // Additional C++ topics...
                    ];
                    break;
                case 'foreign-language':
                    steps = [
                        { topic: "Vocabulary Building", description: "Expand vocabulary.", recommendedTime: "1 hour", advice: "Learn and practice new words daily." },
                        { topic: "Grammar and Structure", description: "Understand grammar rules.", recommendedTime: "1.5 hours", advice: "Focus on sentence structure and tense usage." },
                        { topic: "Listening and Pronunciation", description: "Improve listening skills.", recommendedTime: "2 hours", advice: "Use audio resources for pronunciation practice." },
                        // Additional foreign language topics...
                    ];
                    break;
                case 'ict':
                    steps = [
                        { topic: "Basics of Networking", description: "Understand fundamental networking concepts.", recommendedTime: "1 hour", advice: "Learn about protocols, IP, DNS." },
                        { topic: "Operating Systems", description: "Get familiar with OS basics.", recommendedTime: "1.5 hours", advice: "Focus on processes, threads, and memory management." },
                        { topic: "Security Basics", description: "Learn basic ICT security concepts.", recommendedTime: "1.5 hours", advice: "Understand common security threats and mitigations." },
                        // Additional ICT topics...
                    ];
                    break;
                default:
                    steps = [
                        { topic: "General Introduction", description: "General learning materials.", recommendedTime: "1 hour", advice: "Start with the basics of your selected topic." }
                    ];
                    break;
            }

            // Create the learning plan with specific steps
            learningPlan = await UserLearningPlanModel.create({
                user: userId,
                score: score,
                steps: steps
            });
        }

        // Render different EJS templates based on the quiz type
        let template;
        switch (quizType) {
            case 'cpp':
                template = 'pages/LearnCpp'; // Corrected path
                break;
            case 'foreign-language':
                template = 'pages/LearnFL'; // Corrected path
                break;
            case 'ict':
                template = 'pages/LearnICT'; // Corrected path
                break;
            default:
                template = 'pages/my-learn'; // Default template, corrected path
                break;
        }

        res.render(template, { learningPlan: learningPlan.steps });

    } catch (error) {
        console.error("Error fetching or creating learning plan:", error);
        res.status(500).send("An error occurred while retrieving the learning plan.");
    }
};
