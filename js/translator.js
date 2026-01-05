// Google Translate API를 사용하여 일본어 문장을 한국어로 번역하는 모듈
// .env 파일에 정의된 GOOGLE_TRANSLATION_API_KEY 값을 읽어와 초기화합니다.

var translator = (function() {
	// .env에서 읽어올 API 키 (지연 초기화)
	var GOOGLE_TRANSLATION_API_KEY = null;
	var loadingPromise = null;
	var GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

	/**
	 * .env 파일에서 GOOGLE_TRANSLATION_API_KEY 값을 읽어온다.
	 * .env 예시:
	 *   GOOGLE_TRANSLATION_API_KEY=xxxxxxxxxxxxxxxxxxxx
	 */
	function loadApiKeyFromEnv() {
		if (GOOGLE_TRANSLATION_API_KEY) {
			return Promise.resolve(GOOGLE_TRANSLATION_API_KEY);
		}
		if (loadingPromise) {
			return loadingPromise;
		}

		loadingPromise = fetch(chrome.runtime.getURL(".env")).then(function(response) {
			if (!response.ok) {
				throw new Error("Failed to load .env file: " + response.status);
			}
			return response.text();
		}).then(function(text) {
			var lines = text.split(/\r?\n/);
			var key = null;
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i].trim();
				if (!line || line.startsWith("#")) {
					continue;
				}
				// GOOGLE_TRANSLATION_API_KEY=... 형태 찾기
				if (line.indexOf("GOOGLE_TRANSLATION_API_KEY") === 0) {
					var parts = line.split("=");
					if (parts.length >= 2) {
						// "=" 이후 전체를 값으로 사용 (공백 제거)
						parts.shift();
						key = parts.join("=").trim();
					}
					break;
				}
			}

			if (!key) {
				throw new Error("GOOGLE_TRANSLATION_API_KEY not found in .env");
			}

			GOOGLE_TRANSLATION_API_KEY = key;
			return GOOGLE_TRANSLATION_API_KEY;
		}).catch(function(err) {
			console.warn("API 키를 .env에서 읽어오는 중 오류가 발생했습니다: ", err);
			GOOGLE_TRANSLATION_API_KEY = null;
			throw "API_KEY_NOT_SET";
		});

		return loadingPromise;
	}

	/**
	 * 일본어 텍스트를 한국어로 번역
	 * @param {string} text 번역할 일본어 텍스트
	 * @returns {Promise<string>} 한국어 번역문
	 */
	function translateToKorean(text) {
		if (!text || !text.trim()) {
			return Promise.resolve("");
		}

		// .env에서 API 키를 로드한 뒤 번역 요청
		return loadApiKeyFromEnv().then(function(apiKey) {
			if (!apiKey) {
				throw "API_KEY_NOT_SET";
			}

			var url = GOOGLE_TRANSLATE_ENDPOINT + "?key=" + encodeURIComponent(apiKey);

			var body = {
				q : text,
				source : "ja",
				target : "ko",
				format : "text"
			};

			return fetch(url, {
				method : "POST",
				headers : {
					"Content-Type" : "application/json"
				},
				body : JSON.stringify(body)
			}).then(function(response) {
				if (!response.ok) {
					throw new Error("HTTP Error: " + response.status);
				}
				return response.json();
			}).then(function(data) {
				if (!data || !data.data || !data.data.translations || !data.data.translations[0]) {
					throw new Error("Unexpected response from Google Translate API");
				}
				return data.data.translations[0].translatedText || "";
			});
		});
	}

	return {
		translateToKorean : translateToKorean
	};
})();


