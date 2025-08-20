const bcrypt = require("bcrypt");

async function generateHash(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log("Hashed Password:", hash);
}

generateHash("YourSuperSecurePassword123");
