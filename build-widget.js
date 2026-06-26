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

    const filesToRead = ['polyfills.js', 'main.js'];
    let concatenatedContent = '';

    for (const fileName of filesToRead) {
      const filePath = path.join(browserPath, fileName);
      if (fs.existsSync(filePath)) {
        concatenatedContent += fs.readFileSync(filePath, 'utf8') + '\n';
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

    const publicPath = path.join(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
      fs.copyFileSync(outputFilePath, path.join(publicPath, 'widget.js'));
    }

    // With ShadowDom encapsulation, Angular injects component CSS inside the shadow root
    // automatically — no separate stylesheet needed by the host page.
    // We still export styles.css for documentation / fallback purposes.
    const componentCssPath = path.join(__dirname, 'src', 'app', 'app.css');
    const widgetCssPath = path.join(finalDistPath, 'styles.css');

    if (fs.existsSync(componentCssPath)) {
      const css = fs.readFileSync(componentCssPath, 'utf8');
      fs.writeFileSync(widgetCssPath, css, 'utf8');
      if (fs.existsSync(publicPath)) {
        fs.writeFileSync(path.join(publicPath, 'styles.css'), css, 'utf8');
      }
    }

    const testHtmlSource = path.join(__dirname, 'test-widget.html');
    if (fs.existsSync(testHtmlSource)) {
      fs.copyFileSync(testHtmlSource, path.join(finalDistPath, 'index.html'));
    }

    console.log(`Widget successfully built at: ${outputFilePath}`);
    console.log('NOTE: With ShadowDom encapsulation the host page does NOT need to load styles.css.');
    console.log('      Just add <script src="widget.js"></script> and <support-chat-widget></support-chat-widget>');

  } catch (err) {
    console.error('Error building widget:', err);
    process.exit(1);
  }
}

buildWidget();
