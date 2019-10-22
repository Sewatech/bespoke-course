var 
  bespoke = require('bespoke'),
  bullets = require('bespoke-bullets'),
  classes = require('bespoke-classes'),
  hash = require('./bespoke-hash'),
  nav = require('bespoke-nav'),
  toc = require('./bespoke-toc');

const selectedSlides = Array.from(document.querySelectorAll('section'))
                            .filter(element => getComputedStyle(element).visibility !== 'hidden');

bespoke.from({ parent: 'article.deck', slides: selectedSlides }, [
  classes(),
  nav(),
  bullets('section:not(.no-build) .build, section:not(.no-build) .build-items > *:not(.build-items)')
  , hash()
  , toc()
]);
