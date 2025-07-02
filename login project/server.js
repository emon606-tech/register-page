const express = require('express');
const fetch = require('node-fetch');
const atob = require('atob');
const btoa = require('btoa');
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files (index.html)
app.use(express.static(path.join(__dirname, 'public')));

// === GitHub Setup ===
const GITHUB_USERNAME = 'emon606-tech';
const REPO = 'usr';
const FILE_PATH = 'user.txt';
const API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO}/contents/${FILE_PATH}`;

// 🔐 HEX-encoded GitHub token
const HEX_TOKEN = "6768705f4c48706773495032473773627650315237316f7671347333393754525466317837654c5a";

function hexToString(hex) {
  return hex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
}
const TOKEN = hexToString(HEX_TOKEN);

// === Register API ===
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("Missing required fields.");
  }

  try {
    const getRes = await fetch(API_URL, {
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const json = await getRes.json();
    const content = atob(json.content);
    const sha = json.sha;

    const lines = content.split('\n');
    for (const line of lines) {
      const [existingUser, existingEmail] = line.split(',');
      if (existingUser === username) return res.status(409).send("Username already exists.");
      if (existingEmail === email) return res.status(409).send("Email already exists.");
    }

    const newLine = `${username},${email}\n`;
    const updatedContent = btoa(content + newLine);

    const updateRes = await fetch(API_URL, {
      method: "PUT",
      headers: {
        Authorization: `token ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add user ${username}`,
        content: updatedContent,
        sha: sha
      })
    });

    if (updateRes.ok) {
      res.send("User registered!");
    } else {
      res.status(500).send("Failed to write to GitHub.");
    }

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
