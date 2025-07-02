const express = require('express');
const path = require('path');
const atob = require('atob');
const btoa = require('btoa');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// GitHub Setup
const GITHUB_USERNAME = 'emon606-tech';
const REPO = 'usr';
const FILE_PATH = 'user.txt';
const API_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO}/contents/${FILE_PATH}`;

const HEX_TOKEN = "6768705f4c48706773495032473773627650315237316f7671347333393754525466317837654c5a";

function hexToString(hex) {
  return hex.match(/.{1,2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
}
const TOKEN = hexToString(HEX_TOKEN);

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

    let content = "";
    let sha = null;

    if (json.content) {
      content = atob(json.content);
      sha = json.sha;
    }

    // Check existing users by parsing content blocks
    // We'll parse by splitting on the dashed lines

    // Split entries by the dashed separator
    const entries = content.split('-------------------------------').map(e => e.trim()).filter(Boolean);

    for (const entry of entries) {
      // extract username and email lines
      const lines = entry.split('\n').map(l => l.trim());
      let existingUser = "", existingEmail = "";
      for (const line of lines) {
        if (line.toLowerCase().startsWith('user =')) existingUser = line.split('=')[1].trim();
        if (line.toLowerCase().startsWith('email =')) existingEmail = line.split('=')[1].trim();
      }
      if (existingUser === username) return res.status(409).send("Username already exists.");
      if (existingEmail === email) return res.status(409).send("Email already exists.");
    }

    // Format new user entry
    const newEntry = 
`-------------------------------
user = ${username}
Email = ${email}
password = ${password}
________________________________
`;

    const updatedContent = btoa(content + newEntry);

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
      const errorText = await updateRes.text();
      console.error("GitHub Write Error:", errorText);
      res.status(500).send("Failed to write to GitHub.");
    }

  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).send("Server error.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
