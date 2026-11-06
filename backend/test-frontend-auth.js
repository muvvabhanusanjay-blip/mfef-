const fs = require('fs');
const path = require('path');

function testFrontendFiles() {
  console.log('\n--- Verifying Frontend Auth Files & Assets ---');
  
  const frontendDir = path.join(__dirname, '../frontend');

  const filesToVerify = [
    { file: 'index.html', check: 'SpendWise' },
    { file: 'login.html', check: 'Welcome back' },
    { file: 'signup.html', check: 'Create your account' },
    { file: 'css/common.css', check: '--bg-main: #0B0B19' },
    { file: 'css/auth.css', check: '.auth-card' },
    { file: 'js/api.js', check: 'export const api' },
    { file: 'js/auth.js', check: 'setupLoginForm' }
  ];

  for (const item of filesToVerify) {
    const fullPath = path.join(frontendDir, item.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [Missing File]: ${item.file}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(item.check)) {
      console.error(`❌ [Content Mismatch]: ${item.file} does not contain "${item.check}"`);
      process.exit(1);
    }
    console.log(`✅ [File Verified] ${item.file} exists and contains required structures.`);
  }

  console.log('\n🎉 ALL FRONTEND AUTHENTICATION FILES VALIDATED!\n');
  process.exit(0);
}

testFrontendFiles();
