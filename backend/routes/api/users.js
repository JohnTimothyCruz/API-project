const express = require('express')
const { setTokenCookie, requireAuth } = require('../../utils/auth');

const { User } = require('../../db/models');
const router = express.Router();

const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const { nextTick } = require('async');

const validateSignup = [
    check('email')
        .exists({ checkFalsy: true })
        .isEmail()
        .withMessage('Please provide a valid email'),
    check('username')
        .exists({ checkFalsy: true })
        .isLength({ min: 4 })
        .withMessage('Please provide a username with at least 4 characters'),
    check('username')
        .not()
        .isEmail()
        .withMessage('Username cannot be an email'),
    check('firstName')
        .exists({ checkFalsy: true })
        .withMessage('First Name is required'),
    check('lastName')
        .exists({ checkFalsy: true })
        .withMessage('Last Name is required'),
    check('password')
        .exists({ checkFalsy: true })
        .isLength({ min: 6 })
        .withMessage('Password must be 6 characters or more'),
    handleValidationErrors
];

// Get a user
router.get('/:id',
    async (req, res, next) => {
        const { id } = req.params;

        const user = await User.findByPk(id)

        res.json(user)
    }
)

// Sign up
router.post('/',
    validateSignup,
    async (req, res, next) => {
        const { email, password, username, firstName, lastName } = req.body;

        const userCheck = await User.findOne({
            where: {
                email
            }
        })

        const usernameCheck = await User.findOne({
            where: {
                username
            }
        })

        const err = {
            message: "User already exists",
            statusCode: 403,
            errors: {}
        };

        if (userCheck) {
            err.errors.email = "User with that email already exists"
        }
        if (usernameCheck) {
            err.errors.username = "Username must be unique"
        }

        if (Object.values(err.errors).length) {
            return res.json(err)
        }

        const user = await User.signup({ email, username, password, firstName, lastName });

        await setTokenCookie(res, user);

        return res.json({
            user: user
        });
    }
);


module.exports = router;
