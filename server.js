require('dotenv').config();  // Load .env variables

const express = require("express");
const neo4j = require("neo4j-driver");

const app = express();

const port = process.env.PORT || 3000;
const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE;

app.use(express.json());

// Neo4j connection
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Utility function to run a query on a specific database
async function runQuery(query, params = {}) {
  const session = driver.session({ database });
  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}

// Predefined, safe endpoint to get messages by person
app.post("/getMessagesByPerson", async (req, res) => {
  const { nome } = req.body;

  if (typeof nome !== "string" || nome.trim() === "") {
    return res.status(400).json({ success: false, error: "Invalid 'nome' parameter" });
  }

  try {
    const records = await runQuery(
      "MATCH (p:Pessoa)-[:ENVIOU]->(m:Mensagem) WHERE p.nome = $nome RETURN m",
      { nome }
    );
    res.json({ success: true, records });
  } catch (err) {
    console.error("❌ Error executing query:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


app.post("/getMessagesByDate", async (req, res) => {
  const { date } = req.body;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (typeof date !== "string" || !dateRegex.test(date)) {
    return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-MM-DD." });
  }

  const startDateTime = `${date}T00:00:00`;
  const endDateTime = `${date}T23:59:59`;

  try {
    const records = await runQuery(
      "MATCH (m:Mensagem) WHERE m.timestamp >= $startDateTime AND m.timestamp <= $endDateTime RETURN m",
      { startDateTime, endDateTime }
    );
    res.json({ success: true, records });
  } catch (err) {
    console.error("❌ Error executing query:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


app.post("/getMessagesByDateRange", async (req, res) => {
  const { startDate, endDate } = req.body;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (
    typeof startDate !== "string" || 
    typeof endDate !== "string" ||
    !dateRegex.test(startDate) ||
    !dateRegex.test(endDate)
  ) {
    return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-MM-DD for both startDate and endDate." });
  }

  const startDateTime = `${startDate}T00:00:00`;
  const endDateTime = `${endDate}T23:59:59`;

  try {
    const records = await runQuery(
      "MATCH (m:Mensagem) WHERE m.timestamp >= $startDateTime AND m.timestamp <= $endDateTime RETURN m",
      { startDateTime, endDateTime }
    );
    res.json({ success: true, records });
  } catch (err) {
    console.error("❌ Error executing query:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
app.get("/getAllPeople", async (req, res) => {
  try {
    const records = await runQuery(
      "MATCH (p:Pessoa) RETURN p"
    );
    res.json({ success: true, records });
  } catch (err) {
    console.error("❌ Error executing query:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`🚀 Neo4j API server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("Closing Neo4j driver...");
  await driver.close();
  process.exit();
});
