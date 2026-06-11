import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('components/layouts/AdminLayout')) {
        content = content.replace(/components\/layouts\/AdminLayout/g, 'components/layouts/adminLayout');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
