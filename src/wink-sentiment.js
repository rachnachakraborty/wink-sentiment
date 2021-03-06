//     wink-sentiment
//     Accurate and fast sentiment scoring of phrases with emoticons & emojis.
//
//     Copyright (C) 2017  GRAYPE Systems Private Limited
//
//     This file is part of “wink-sentiment”.
//
//     “wink-sentiment” is free software: you can redistribute
//     it and/or modify it under the terms of the GNU Affero
//     General Public License as published by the Free
//     Software Foundation, version 3 of the License.
//
//     “wink-sentiment” is distributed in the hope that it will
//     be useful, but WITHOUT ANY WARRANTY; without even
//     the implied warranty of MERCHANTABILITY or FITNESS
//     FOR A PARTICULAR PURPOSE.  See the GNU Affero General
//     Public License for more details.
//
//     You should have received a copy of the GNU Affero
//     General Public License along with “wink-sentiment”.
//     If not, see <http://www.gnu.org/licenses/>.

//
var emojis = require( './emojis.js' );
var afinn = require( './afinn-en-165.js' );
var emoticons = require( './emoticons.js' );
var negations = require( './negations.js' );
var affin2Grams = require( './afinn-en-165-2grams.js' );

/* eslint max-depth: 0 */

// Used to remove extra spaces.
var rgxSpaces = /\s+/ig;
// Used to split on **non-words** to extract words.
var rgxNonWords = /\W+/ig;
// Used to split alphas & spaces, which are not part of emoticons to extract emoticons.
var rgxEmoticons = /[abce-nt-z ]/ig;
// Used to extract emojis.
var rgxEmojis = /([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF])/g;
// Used to expant elisions.
var rgxNotElision = /([a-z])(n\'t)\b/gi;

// ### analyzeSentiment
/**
 *
 * Computes the absolue  and normalized sentiment scores of the input `phrase`.
 * The normalized score is computed by dividing the absolute score by the number
 * of tokens; this is always between -5 and +5. A score of **less than 0** indicates
 * negative sentiments and a score of **more than 0** indicates positive sentiments;
 * wheras a **near zero** score suggests a neutral sentiment.
 *
 * @param {string} phrase — whoes sentiment score needs to be computed.
 * @return {object} — absolute `score` and `normalizedScore` of `phrase`.
 *
 * @example
 * analyzeSentiment( 'not a good product' );
 * // -> { score: -3, normalizedScore: -1 }
 * analyzeSentiment( 'Excited to be part of the @imascientist team for the next couple of weeks!' );
 * // { score: 3, normalizedScore: 0.21428571428571427 }
 */
var analyzeSentiment = function ( phrase ) {
  if ( typeof phrase !== 'string' ) {
    throw Error( 'wink-sentiment: input phrase must be a string, instead found: ' + typeof phrase );
  }
  // Preprocess the sentence.
  var s = phrase.trim().replace( rgxSpaces, ' ' ).replace( rgxNotElision, '$1 not' );
  // Early exit.
  if ( s.length === 0 ) return { score: 0, normalizedScore: 0 };
  // These tokens will contain text and emojis. The text part will be tokenized later.
  var tokens = s.split( rgxEmojis );
  // The emoticon & word tokens.
  var emoticonTokens, wordTokens;
  // Sentiment Score.
  var ss = 0;
  // Number of words encountered.
  var words = 0;
  // Helpers: for loop indexes, token, temp ss, and word count.
  var i, imax, k, kmax, t, tss, wc;

  for ( i = 0, imax = tokens.length; i < imax; i += 1 ) {
    t = tokens[ i ];
    // All our emojis have a length < 3; quick & dirty way to detect potential emojis!
    if ( t.length && ( t.length < 3 ) && ( emojis[ t ] !== undefined ) ) {
      ss += emojis[ t ];
      words += 1;
    }

    // Ignore 1 letter words completely!
    if ( t.length > 1 ) {
      // AFINN & Emoticons have a minimum length of 2!
      emoticonTokens = t.split( rgxEmoticons );
      wordTokens = t.toLowerCase().split( rgxNonWords );
      // First process emoticons.
      for ( k = 0, kmax = emoticonTokens.length; k < kmax; k += 1 ) {
        t = emoticonTokens[ k ];
        if ( ( t.length > 1 ) && ( emoticons[ t ] !== undefined ) ) {
          ss += emoticons[ t ];
          words += 1;
        }
      }
      // Then the words.
      for ( k = 0, kmax = wordTokens.length; k < kmax; k += 1 ) {
        t = wordTokens[ k ];
        if ( t.length > 1 ) {
          wc = 1;
          if ( afinn[ t ] !== undefined ) {
            // Check for bigram configurations i.e. token at `k` and `k+1`. Accordingly
            // compute the sentiment score in `tss`.
            if ( ( k < ( kmax - 1 ) ) && affin2Grams[ t ] && ( affin2Grams[ t ][ wordTokens[ k + 1 ] ] !== undefined ) ) {
              tss = affin2Grams[ t ][ wordTokens[ k + 1 ] ];
              // Will have to count `2` words!
              wc = 2;
            } else {
              tss = afinn[ t ];
            }
            // Check for negation — upto two words ahead; even a bigram config may be negated!
            ss +=  ( ( k > 0 && negations[ wordTokens[ k - 1 ] ] ) || ( k > 1 && negations[ wordTokens[ k - 2 ] ] ) ) ? -tss : tss;
            // Increment `k` by 1 if a bigram config was found earlier i.e. `wc` was set to **2**.
            k += ( wc - 1 );
          }
          // Update number of words accordingly.
          words += wc;
        }
      }
    }
  }
  // To avoid division by 0!
  // if ( words === 0 ) words = 1;
  // Return score and its normalized value.
  return { score: ss, normalizedScore: ( ss / words ) };
}; // analyzeSentiment()

module.exports = analyzeSentiment;
