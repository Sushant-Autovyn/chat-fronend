const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function buildWidget() {
  try {
    console.log('Building Angular project...');
    execSync('npx ng build --output-hashing=none', { stdio: 'inherit' });

    console.log('Concatenating files...');
    const browserPath = path.join(__dirname, 'dist', 'user-frontend', 'browser');
    
    if (!fs.existsSync(browserPath)) {
        throw new Error(`Output directory not found: ${browserPath}`);
    }

    const filesToRead = [
      'polyfills.js',
      'main.js'
    ];

    let concatenatedContent = '';

    for (const fileName of filesToRead) {
      const filePath = path.join(browserPath, fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        concatenatedContent += fileContent + '\n';
      } else {
        console.warn(`Warning: Could not find ${fileName} in the build output.`);
      }
    }

    const finalDistPath = path.join(__dirname, 'dist', 'widget');
    if (!fs.existsSync(finalDistPath)) {
        fs.mkdirSync(finalDistPath, { recursive: true });
    }

    const outputFilePath = path.join(finalDistPath, 'widget.js');
    fs.writeFileSync(outputFilePath, concatenatedContent, 'utf8');

    const cssPath = path.join(browserPath, 'styles.css');
    if (fs.existsSync(cssPath)) {
        fs.copyFileSync(cssPath, path.join(finalDistPath, 'styles.css'));
    }
    
    const testHtmlSource = path.join(__dirname, 'test-widget.html');
    if (fs.existsSync(testHtmlSource)) {
        fs.copyFileSync(testHtmlSource, path.join(finalDistPath, 'index.html'));
    }

    console.log(`Widget successfully built at: ${outputFilePath}`);

  } catch (err) {
    console.error('Error building widget:', err);
    process.exit(1);
  }
}

buildWidget();
