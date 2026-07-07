const task = process.argv[2] ?? 'task';
const workspace = process.env.npm_package_name ?? 'workspace';

console.log(`${workspace}: ${task} disponível na Sprint 1+`);
