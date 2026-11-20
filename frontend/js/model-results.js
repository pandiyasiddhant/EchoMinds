
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var saved = sessionStorage.getItem('echomindsResult');
    var originalText = sessionStorage.getItem('echomindsInputText');
    var inputType = sessionStorage.getItem('echomindsInputType') || 'text';

    if (!saved) {
      console.warn('No model result found.');
      return;
    }

    var result;

    try {
      result = JSON.parse(saved);
    } catch (error) {
      console.error('Could not read the saved model result.', error);
      return;
    }

    if (
      !result ||
      !['Normal', 'Stress', 'Severe'].includes(result.label) ||
      typeof result.confidence !== 'number' ||
      !result.all_scores
    ) {
      console.error('Unexpected model response format.');
      return;
    }

    var isVoice = inputType === 'voice';
    var confidence = Math.round(result.confidence * 100);

    var cards = document.querySelectorAll('.dash-grid.grid-3 > .card');
    var gauge = document.querySelector('.risk-gauge');
    var ring = document.querySelector('.progress-ring');

    // Update the introductory message.
    var intro = document.querySelector('.alert-info div');

    if (intro) {
      intro.textContent = isVoice
        ? 'Your voice recording has been processed by the experimental EchoMinds voice model.'
        : 'Your written check-in has been processed by the experimental EchoMinds text model.';
    }

    // First card: predicted category.
    if (cards[0]) {
      var title = cards[0].querySelector('h3');
      var category = cards[0].querySelector('.risk-gauge__center strong');
      var subtitle = cards[0].querySelector('.risk-gauge__center span');
      var legend = cards[0].querySelector('.chart-legend');

      if (title) title.textContent = 'Model prediction (experimental)';
      if (category) category.textContent = result.label;
      if (subtitle) subtitle.textContent = 'Predicted category';

      if (gauge) {
        gauge.dataset.percent = String(confidence);
        gauge.setAttribute(
          'aria-label',
          'Experimental model prediction: ' + result.label
        );
      }

      if (legend) {
        legend.textContent =
          'Classification only — not a wellness or clinical rating.';
      }
    }

    // Second card: model confidence.
    if (cards[1]) {
      var title2 = cards[1].querySelector('h3');
      var percent = cards[1].querySelector('.progress-ring__label strong');
      var label = cards[1].querySelector('.progress-ring__label span');
      var description = cards[1].querySelector('p');

      if (title2) title2.textContent = 'Model confidence';
      if (percent) percent.textContent = confidence + '%';
      if (label) label.textContent = 'For predicted category';

      if (description) {
        description.textContent =
          'Predicted probability for the selected category. This is not diagnostic certainty.';
      }

      if (ring) ring.dataset.percent = String(confidence);
    }

    // Third card: prediction summary.
    if (cards[2]) {
      var title3 = cards[2].querySelector('h3');
      var badge = cards[2].querySelector('.badge');
      var summary = cards[2].querySelector('p');

      if (title3) title3.textContent = 'Prediction summary';

      if (badge) {
        badge.className = 'badge';
        badge.textContent = 'Predicted category: ' + result.label;
      }

      if (summary) {
        summary.textContent =
          'This experimental classification may be incorrect. It is not a clinical diagnosis or safety assessment.';
      }
    }

    // First detail section: submitted input.
    var sections = document.querySelectorAll('.dash-grid.grid-2 > .card');

    if (sections[0]) {
      var heading = sections[0].querySelector('h3');
      var cloud = sections[0].querySelector('.chip-cloud');

      if (heading) {
        heading.textContent = isVoice
          ? 'Voice recording analysed'
          : 'Your submitted check-in';
      }

      if (cloud) {
        cloud.replaceChildren();

        var submitted = document.createElement('p');
        submitted.className = 'text-sm';
        submitted.textContent = isVoice
          ? 'An audio recording was submitted to the EchoMinds voice emotion classification model. No speech transcript was generated.'
          : (originalText || 'No saved text available.');

        cloud.appendChild(submitted);
      }
    }

    // Second detail section: actual model scores.
    if (sections[1]) {
      var heading2 = sections[1].querySelector('h3');
      var cloud2 = sections[1].querySelector('.chip-cloud');

      if (heading2) heading2.textContent = 'Model output scores';

      if (cloud2) {
        cloud2.replaceChildren();

        ['Normal', 'Stress', 'Severe'].forEach(function (name) {
          var score = result.all_scores[name];
          var chip = document.createElement('span');

          chip.className = 'chip';
          chip.textContent = name + ': ' +
            (typeof score === 'number'
              ? (score * 100).toFixed(2) + '%'
              : 'Unavailable');

          cloud2.appendChild(chip);
        });
      }
    }

    // Hide static emotion/keyword-based recommendations for voice.
    if (isVoice) {
      document.querySelectorAll('.assessment-shell > .card').forEach(function (card) {
        var heading = card.querySelector('h3');

        if (heading && heading.textContent.trim() === 'Suggestions for You') {
          card.hidden = true;
        }
      });
    }

    // Update the result timestamp label.
    var meta = document.querySelector('.topbar__meta');

    if (meta) {
      meta.textContent = isVoice
        ? 'Results from your voice check-in'
        : 'Results from your text check-in';
    }

    // Experimental model disclaimer.
    var alerts = document.querySelectorAll('.alert-warning');

    if (alerts.length) {
      alerts[0].textContent =
        'Experimental AI ' + (isVoice ? 'voice emotion' : 'text') +
        ' classification only. These results may be incorrect and must not be used as a clinical diagnosis, mental-health assessment, or safety assessment. Consider speaking with a qualified professional if you need support.';
    }

    console.log('EchoMinds model result displayed:', {
      inputType: inputType,
      result: result
    });
  });
})();
