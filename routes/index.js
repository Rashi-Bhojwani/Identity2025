var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/resumebuilder', function(req, res, next) {
  res.render('resumebuilder');
});

router.get('/AiCoverletter', function(req, res, next) {
  res.render('AiCoverletter');
});

router.get('/ResumeEnhancer', function(req, res, next) {
  res.render('ResumeEnhancer');
});

router.get('/cityjobs', function(req, res, next) {
  res.render('cityjobs');
});

router.get('/recommendation', function(req, res, next) {
  res.render('recommendation');
});

router.get('/score', function(req, res, next) {
  res.render('score');
});

router.get('/resumebuilder/Premium&Professional', function(req, res, next) {
  res.render('Premium&Professional');
});

router.get('/resumebuilder/Strong&Credible', function(req, res, next) {
  res.render('Strong&Credible');
});

router.get('/resumebuilder/Elegant&Classy', function(req, res, next) {
  res.render('Elegant&Classy');
});

router.get('/resumebuilder/Simple&Impressive', function(req, res, next) {
  res.render('Simple&Impressive');
});

router.get('/resumebuilder/Modern&Stylish', function(req, res, next) {
  res.render('Modern&Stylish');
});

router.get('/resumebuilder/StrongRecommendation', function(req, res, next) {
  res.render('StrongRecommendation');
});



module.exports = router;
