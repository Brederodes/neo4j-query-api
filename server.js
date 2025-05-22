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

// Predefined, safe endpoint to create a person
app.post("/createPerson", async (req, res) => {
  const { nome } = req.body;

  if (typeof nome !== "string" || nome.trim() === "") {
    return res.status(400).json({ success: false, error: "Invalid 'nome' parameter" });
  }

  try {
    const records = await runQuery(
      "CREATE (p:Pessoa { nome: $nome }) RETURN p",
      { nome }
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
