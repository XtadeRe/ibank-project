const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');

router.get('/', BranchController.getBranches);

module.exports = router;