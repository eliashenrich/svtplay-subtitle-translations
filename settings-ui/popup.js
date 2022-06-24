let btnPrepareSubtitles = document.getElementById('btnPrepareSubtitles');
let btnApplyTranslation = document.getElementById('btnApplyTranslation');

let translatableDiv = null;

var originalSubtitles = [];
var translationMap = {};

btnPrepareSubtitles.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: stepPrepareStubtitles,
    });
});

btnApplyTranslation.addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({active: true, currentWindow: true});

  chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: stepOverrideSubtitles,
  });
});


async function stepPrepareStubtitles() {
    // Create new div to show subtitles data before loading the titles
    let subtitleNode = document.querySelector('div[class*="_video-player__text-tracks"]');

    if (!subtitleNode) {
        return 'Subtitle node not found.';
    }

    if (!subtitleNode) {
        return;
    }

    translationWrapper = document.createElement('div');
    translationWrapper.classList = subtitleNode.classList;

    translatableDiv = document.createElement('div');
    translatableDiv.setAttribute('style', 'width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;background-color:#7788ff;');
    translatableDiv.id = 'subtitle-translation';

    translationWrapper.appendChild(translatableDiv);

    subtitleNode.parentNode.insertBefore(translationWrapper, subtitleNode.nextSibling);

    // Download subtitles and display in translatable div
    const thumbnailNode = document.querySelector('div[class*="thumbnail-badge--time"]');

    if (!thumbnailNode) {
        console.error('Unable to identify video id.');
        videoId = false;

        return;
    }

    let thumbnailUrl = thumbnailNode.firstChild.style['background-image']
    thumbnailUrl = thumbnailUrl.replace('url(', '');
    thumbnailUrl = thumbnailUrl.replace('"', '');

    let thumbnailUrlParts = thumbnailUrl.split('/');

    if (thumbnailUrlParts.length < 7) {
        console.error('Invalid thumbnail url. Unable to identify video id.');
        subtitleUrl = false;
        return;
    }

    thumbnailUrlParts[thumbnailUrlParts.length - 1] = 'text/text-0.vtt';
    const subtitleUrl = thumbnailUrlParts.join('/');

    if (!subtitleUrl) {
        console.error('Error creating subtitle url.');
        return;
    }

    originalSubtitles = await fetch(subtitleUrl)
        .then(response => response.text())
        .then(data => {
            let parts = data.split("\n\n");
            let content = '';

            let originalSubtitles = {};
            parts.forEach((part, index) => {
              let partContent = part.slice(part.indexOf('\n')).trim();
              originalSubtitles[index] = partContent;
              content += "\n\n|||" + index + ":::" + partContent;
            })

            translatableDiv.innerText = content

            return originalSubtitles;
        });
}

function stepOverrideSubtitles() {
  let translatableDiv = document.getElementById('subtitle-translation')
  const translated = translatableDiv.innerText

  const parts = translated.split("|||");

  let translationMap = {};
  let keys = originalSubtitles;
  
  parts.forEach(part => {
    let index = part.slice(0, part.indexOf(':::')).trim();

    let key = keys[index]
    let translation = part.slice(part.indexOf(':::') + 3);

    translationMap[key] = translation;
  });

  // Hide translatable div
  translatableDiv.parentNode.removeChild(translatableDiv);

  // Setup Subtitle translations

  let subtitleNode = document.querySelector('div[class*="_video-player__text-tracks"]');
  
  let translatedSubtitleWrapperNode = subtitleNode.cloneNode(true);
  subtitleNode.parentNode.appendChild(translatedSubtitleWrapperNode);

  let translatedSubtitleNode = translatedSubtitleWrapperNode.querySelector('div > p > span > span');

  subtitleNode.style.opacity = 0.0;
  
  subtitleNode.addEventListener('DOMSubtreeModified', (e) => {
    let originalText = e.target.innerText;
      if (!originalText) {
        translatedSubtitleNode.innerText = '';
      }

      let translatedText = originalText;
      if (translationMap[originalText]) {
        translatedText = translationMap[originalText]
      }

      translatedText = translatedText.replace('\n\n\n', '\n');
      translatedText = translatedText.replace('\n\n', '\n');

      translatedSubtitleNode.innerText = translatedText;
  })
}