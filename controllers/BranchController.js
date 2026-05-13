// controllers/BranchController.js
const fetch = require('node-fetch'); // npm install node-fetch

// GET /api/branch-data
exports.getBranches = async (req, res) => {
    try {
        const response = await fetch('https://api.github.com/repos/XtadeRe/ibank-project/branches');

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const branches = await response.json();
        const branchNames = branches.map(branch => branch.name);

        console.log(`Получено ${branchNames.length} веток из GitHub`);

        res.json({
            status: "success",
            data: branchNames
        });

    } catch (err) {
        console.error('Ошибка получения веток из GitHub:', err);

        const defaultBranches = ['main', 'master', 'develop', 'createStack'];
        res.json({
            status: "success",
            data: defaultBranches,
            warning: 'Используются стандартные ветки'
        });
    }
};