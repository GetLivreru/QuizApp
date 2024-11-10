const OpenAI = require('openai'); // Импортируйте OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Инициализация клиента

exports.getMyLearn = async (req, res) => {
    try {
        const quizResults = req.query.results;
        if (!quizResults || quizResults.trim().length === 0) {
            console.log("Quiz results are missing");
            return res.status(400).send('Quiz results are required');
        }
        console.log("Quiz results received:", quizResults);

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: `Based on the quiz score of ${quizResults}, provide a structured learning plan divided by weeks for C++. Include the hours of study and detailed breakdowns for each topic. Format the response like this:





Week 1: Basics of C++
Study Hours: 6-8 hours
- Installation and setup (1 hour)
  - Install an IDE like Visual Studio or Code::Blocks, and set up the compiler.
- Basic syntax and program structure (2 hours)
  - Understand the structure of a C++ program. Learn about the main() function, comments, and basic data types (int, float, char, bool).
- Input and output (1 hour)
  - Use cin and cout for input and output.
- Variables and operations (2 hours)
  - Study data types, variable declaration, and basic arithmetic operations.
  - Practice creating simple programs with calculations.
- Homework and practice (1-2 hours)
  - Implement programs using arithmetic and work with input/output.

... (continue with the structure for additional weeks)`
                }
            ],
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 1,
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("No response choices from OpenAI API");
        }

        const feedback = response.choices[0].message.content.trim();

        // Example parsing logic to split feedback into structured `learningPlan` array
        const learningPlan = feedback.split("\n\n").map((section) => {
            const lines = section.split("\n");
            return {
                topic: lines[0],  // First line is the topic (e.g., "Week 1: Basics of C++")
                details: lines.slice(1).join("<br>") // Join remaining lines as details
            };
        });

        res.render('pages/my-learn', { learningPlan }); // Pass structured `learningPlan` to template
    } catch (error) {
        console.error("Error generating feedback:", error);
        res.status(500).send('Error generating feedback');
    }
};
