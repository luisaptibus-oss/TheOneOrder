import { execSync } from 'child_process';
try {
  console.log(execSync('git status').toString());
  execSync('git checkout -- src/App.tsx');
  console.log('Reverted src/App.tsx');
} catch (e) {
  console.error(e);
}
