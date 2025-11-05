const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;