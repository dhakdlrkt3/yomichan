var ymcContent = {
	popupSpacing : 5,
	enabled : false,
	oldSelectionText : "",
	expand : false,
	settingExpand : false,
	clickSettingPopup : false, 
	minFontSize : 10,
	maxFontSize : 20,
	noteFontSizeDiff: 4,
	setting: {
		backgroundColor: "#1C1C1C",
		textColor: "#4CEE4C",
		wordColor: "#FFFFFF", // 後方互換性のため保持
		textFontSize: 12,
		wordFontSize: 14, // 後方互換性のため保持
		kanjiColor: "#FFFFFF",
		kanjiFontSize: 14,
		furiganaColor: "#FFFFFF",
		furiganaFontSize: 10,
		showFurigana: true,
	},
	// 有効にする
	enable : function() {
		chrome.storage.local.get("showYomichanPopup", function(value) {
			ymcContent.expand = value.showYomichanPopup;
			if (ymcContent.expand === undefined) {
				ymcContent.expand=true;
			}
		});
		if (ymcContent.enabled) {
			return;
		}
		ymcContent.enabled = true;

		// Local Storageからポップアップの設定情報を取得
		chrome.storage.local.get("yomichanSetting", function(value) {
			let setting = value.yomichanSetting;
			if (setting === undefined) {
				chrome.storage.local.set({
					"yomichanSetting": ymcContent.setting
				}, function() {
				});
			} else {
				// 既存設定との互換性：wordColor/wordFontSizeがあればkanjiColor/kanjiFontSizeに移行
				if (setting.wordColor && !setting.kanjiColor) {
					setting.kanjiColor = setting.wordColor;
				}
				if (setting.wordFontSize && !setting.kanjiFontSize) {
					setting.kanjiFontSize = setting.wordFontSize;
				}
				if (setting.wordColor && !setting.furiganaColor) {
					setting.furiganaColor = setting.wordColor;
				}
				if (setting.wordFontSize && !setting.furiganaFontSize) {
					setting.furiganaFontSize = Math.max(ymcContent.minFontSize, setting.wordFontSize - ymcContent.noteFontSizeDiff);
				}
				// デフォルト値の設定
				if (!setting.kanjiColor) setting.kanjiColor = "#FFFFFF";
				if (!setting.kanjiFontSize) setting.kanjiFontSize = 14;
				if (!setting.furiganaColor) setting.furiganaColor = "#FFFFFF";
				if (!setting.furiganaFontSize) setting.furiganaFontSize = 10;
				if (setting.showFurigana === undefined) setting.showFurigana = true;
				ymcContent.setting = setting;
			}
		});

		window.addEventListener('mousedown', this.onMouseDown, false);
		window.addEventListener('mouseup', this.onMouseUp, false);
		document.addEventListener('selectionchange', this.onSelectionchange,
				false);
	},
	// 無効にする
	disable : function() {
		if (!ymcContent.enabled) {
			return;
		}
		ymcContent.enabled = false;
		ymcContent.closePopup();
		window.removeEventListener('mousedown', this.onMouseDown, false);
		window.removeEventListener('mouseup', this.onMouseUp, false);
		window.removeEventListener('selectionchange', this.onSelectionchange,
				false);
	},
	// マウスアップ
	onMouseUp : function(event) {
		if (ymcContent.clickSettingPopup) {
			return;
		}
		var selection = ymcContent.getSelection();
		if (selection == null
				|| (ymcContent.oldSelectionText == selection.selectionText && document
						.querySelectorAll('.yomichan-popup').length > 0)) {
			return;
		}
		if (selection != null && selection.selectionText != "") {
			try {
				chrome.runtime
						.sendMessage(
								{
									type : "getFurigana",
									data : selection.selectionText
								},
								function(response) {
									if (response) {
										var checkSelection = ymcContent
												.getSelection();
										if (ymcContent.enabled
												&& checkSelection != null
												&& checkSelection.selectionText != "") {
											ymcContent.closePopup();
											ymcContent.showPopup(selection,
													response);
											ymcContent.oldSelectionText = (selection != null) ? selection.selectionText
													: "";
										}
									}
								});
			} catch (e) {
				// do nothing
			}
		}
	},
	// マウスダウン
	onMouseDown : function(event) {
		var settingPopup = document.querySelector(".yomichan-setting-popup")
		if (settingPopup) {
			var clickedElem = event.target.closest(".yomichan-setting-popup");
			if (clickedElem == settingPopup) {
				ymcContent.clickSettingPopup = true;
				return;
			}
		}
		ymcContent.clickSettingPopup = false;
		
		// ポップアップ内側をクリックした場合は閉じない
		var popup = document.querySelector(".yomichan-popup");
		if (popup) {
			var clickedPopup = event.target.closest(".yomichan-popup");
			if (clickedPopup) {
				// ポップアップ内側のクリックは無視（閉じるボタン以外）
				return;
			}
		}
		// ポップアップ外側をクリックした場合、ポップアップを閉じる
		if (popup) {
			ymcContent.closePopup();
		}
	},
	// 選択内容が変わるイベント
	onSelectionchange : function(event) {
		if (ymcContent.clickSettingPopup) {
			return;
		}
		// ポップアップ内の選択変更の場合は閉じない
		var popup = document.querySelector(".yomichan-popup");
		if (popup) {
			var selection = window.getSelection();
			if (selection.rangeCount > 0) {
				var range = selection.getRangeAt(0);
				var clickedElem = range.commonAncestorContainer;
				// ポップアップ内の要素か確認
				if (popup.contains(clickedElem.nodeType === Node.TEXT_NODE ? clickedElem.parentNode : clickedElem)) {
					return;
				}
			}
		}
		ymcContent.closePopup();
	},
	// ひらがなを付けるテキストのポップアップを表示
	showPopup : function(selection, html) {
		var popup = document.createElement('div');
		popup.style.backgroundColor = ymcContent.setting.backgroundColor;
		popup.classList.add('yomichan-popup');

		// 원본 선택 텍스트 (번역/토큰화에 사용)
		var originalText = selection && selection.selectionText ? selection.selectionText : "";

		// ヘッダーエリア（ボタン用）
		var popupHeader = document.createElement('div');
		popupHeader.classList.add('yomichan-popup-header');
		popup.appendChild(popupHeader);

		// ふりがな表示切替ボタン
		var yomichanFuriganaToggleButton = document.createElement('button');
		yomichanFuriganaToggleButton.classList.add('yomichan-furigana-toggle-button');
		// 表示状態に応じてラベルを設定（ON: あ, OFF: あ×）
		function updateFuriganaToggleLabel() {
			if (ymcContent.setting.showFurigana === false) {
				yomichanFuriganaToggleButton.textContent = 'あ×';
				yomichanFuriganaToggleButton.setAttribute('aria-label', 'ふりがなを表示しない');
				yomichanFuriganaToggleButton.classList.add('yomichan-furigana-off');
			} else {
				yomichanFuriganaToggleButton.textContent = 'あ';
				yomichanFuriganaToggleButton.setAttribute('aria-label', 'ふりがなを表示する');
				yomichanFuriganaToggleButton.classList.remove('yomichan-furigana-off');
			}
		}
		updateFuriganaToggleLabel();
		popupHeader.appendChild(yomichanFuriganaToggleButton);

		// 設定ボタン
		var yomichanSettingButton = document.createElement('button');
		yomichanSettingButton.classList.add('yomichan-setting-button');
		popupHeader.appendChild(yomichanSettingButton);

		// 閉じるボタン
		var yomichanCloseButton = document.createElement('button');
		yomichanCloseButton.classList.add('yomichan-close-button');
		yomichanCloseButton.textContent = '×';
		yomichanCloseButton.setAttribute('aria-label', '閉じる');
		popupHeader.appendChild(yomichanCloseButton);

		// コンテンツを表示するエリア
		var yomichanContent = document.createElement('div');
		yomichanContent.style.color = ymcContent.setting.textColor;
		yomichanContent.style.fontSize = ymcContent.setting.textFontSize + "px";
		yomichanContent.classList.add('yomichan-content');
		yomichanContent.innerHTML = html;
		popup.appendChild(yomichanContent);

		// 버튼 영역 (팝업 하단)
		var buttonArea = document.createElement('div');
		buttonArea.classList.add('yomichan-button-area');
		popup.appendChild(buttonArea);

		// 문장 번역 버튼
		var translateButton = document.createElement('button');
		translateButton.classList.add('yomichan-translate-button');
		translateButton.textContent = '문장 번역';
		buttonArea.appendChild(translateButton);

		// 단어 분석(토큰화) 버튼 - 일단 UI만
		var tokenizeButton = document.createElement('button');
		tokenizeButton.classList.add('yomichan-tokenize-button');
		tokenizeButton.textContent = '단어 분석';
		buttonArea.appendChild(tokenizeButton);

		// 번역 결과 표시 영역 (버튼 영역 아래)
		var translationResult = document.createElement('div');
		translationResult.classList.add('yomichan-translation-result');
		popup.appendChild(translationResult);

		// 縮小ボタン
		var yomichanPopupToggleButton = document.createElement('button');
		yomichanPopupToggleButton.classList.add('yomichan-popup-toggle-button');
		popup.appendChild(yomichanPopupToggleButton);

		// bodyに追加
		document.body.appendChild(popup);

		// rubyのstyleを設定
		// 漢字（rb）のスタイル設定
		var kanjiColor = ymcContent.setting.kanjiColor || ymcContent.setting.wordColor;
		var kanjiFontSize = ymcContent.setting.kanjiFontSize || ymcContent.setting.wordFontSize;
		document.querySelectorAll('.yomichan-content>ruby>rb').forEach(function(word) {
			word.style.color = kanjiColor;
			word.style.fontSize = kanjiFontSize + "px";
		});
		// rubyタグ全体にも漢字のスタイルを適用（後方互換性のため）
		document.querySelectorAll('.yomichan-content>ruby').forEach(function(word) {
			word.style.color = kanjiColor;
			word.style.fontSize = kanjiFontSize + "px";
		});
		// 번역 문장 영역의 폰트 크기를 '한자' 크기와 동일하게 설정
		translationResult.style.fontSize = kanjiFontSize + "px";
		// ふりがな（rt）のスタイル設定
		var furiganaColor = ymcContent.setting.furiganaColor || ymcContent.setting.wordColor;
		var furiganaFontSize = ymcContent.setting.furiganaFontSize || (kanjiFontSize - ymcContent.noteFontSizeDiff);
		function applyFuriganaVisible(visible) {
			document.querySelectorAll('.yomichan-content>ruby>rt').forEach(function(word) {
				word.style.color = furiganaColor;
				word.style.fontSize = furiganaFontSize + "px";
				word.style.display = visible ? '' : 'none';
			});
		}
		applyFuriganaVisible(ymcContent.setting.showFurigana !== false);

		// 表示する幅を再計算
		var _style = window.getComputedStyle(popup, null);
		let horizontalPadding = parseFloat(_style.paddingLeft)
				+ parseFloat(_style.paddingRight);
		let verticalPadding = parseFloat(_style.paddingTop)
				+ parseFloat(_style.paddingBottom)
		let maxWidth = Math.max(selection.maxWidth, selection.width)
				- horizontalPadding;
		popup.style.maxWidth = Math.ceil(maxWidth) + "px";

		// 表示する内容の幅を取得し、ポップアップに設定する
		var range = document.createRange();
		range.selectNodeContents(yomichanContent);
		let width = Math.ceil(Math.min(maxWidth,
				range.getBoundingClientRect().width));
		popup.style.width = Math.ceil(width) + "px";
		window.getSelection().removeRange(range);

		// 表示する位置を計算
		let right = document.documentElement.clientWidth
				- (selection.right + document.documentElement.scrollLeft);
		right = Math.min(right, document.documentElement.clientWidth - width
				- horizontalPadding);
		right = Math.max(right, yomichanPopupToggleButton.clientWidth);
		popup.style.right = right + "px";

		// 항상 선택 영역 아래쪽에 표시되도록 설정 (기존 문장을 가리지 않도록)
		let y = selection.bottom + document.documentElement.scrollTop
				+ ymcContent.popupSpacing;
		popup.classList.add('yomichan-popup-bottom');
		popup.style.top = y + "px";

		// 展開する場合のサイズを記憶（폭만 고정, 높이는 auto로 유지하여 아래로 늘어나도록 함）
		var _clientW = popup.clientWidth - horizontalPadding;

		// 拡大縮小ボタンの押下イベント
		yomichanPopupToggleButton.addEventListener('click', function() {
			var isHidden = popup.classList.contains('yomichan-popup-hidden');
			togglePopup(isHidden);
		}, false);

		togglePopup(ymcContent.expand, true);

		// ポップアップの展開・縮小を設定
		function togglePopup(expand, isInit) {
			// 展開状態を記憶
			chrome.storage.local.set({
				'showYomichanPopup' : expand
			}, function() {
			});
			ymcContent.expand = expand;

			if (!isInit) {
				if (!popup.classList.contains('yomichan-popup-transition')) {
					popup.classList.add('yomichan-popup-transition');
				}
			}
			// 높이는 auto로 두고, 축소 시에만 0으로 만들어 기존 문장을 가리지 않도록 함
			popup.style.height = expand ? 'auto' : '0px';
			popup.style.width = expand ? _clientW + 'px' : '0px';

			let settingButton = document.querySelector('.yomichan-setting-button');
			settingButton.style.display = expand ? 'block' : 'none';

			let settingPopup = document.querySelector('.yomichan-setting-popup');
			if (!expand && settingPopup) {
				settingPopup.remove();
				ymcContent.settingExpand = false;
			}

			if (expand) {
				popup.classList.remove('yomichan-popup-hidden');
			} else {
				popup.classList.add('yomichan-popup-hidden');
			}
		}

		// 設定ボタンの押下イベント
		yomichanSettingButton.addEventListener('click', function(event) {
			event.stopPropagation();
			if (ymcContent.settingExpand == false) {
				showSettingPopup();
				ymcContent.settingExpand = true;
			} else {
				closeSettingPopup();
				ymcContent.settingExpand = false
			}
		}, false);

		// 閉じるボタンの押下イベント
		yomichanCloseButton.addEventListener('click', function(event) {
			event.stopPropagation();
			ymcContent.closePopup();
		}, false);

		// ふりがな表示切替ボタンの押下イベント
		yomichanFuriganaToggleButton.addEventListener('click', function(event) {
			event.stopPropagation();
			// トグル
			var newValue = (ymcContent.setting.showFurigana === false);
			ymcContent.setting.showFurigana = newValue;
			updateFuriganaToggleLabel();
			applyFuriganaVisible(newValue);
			// Local Storageに保存
			chrome.storage.local.set({
				'yomichanSetting' : ymcContent.setting
			}, function() {
			});
		}, false);

		// ポップアップ内のクリックイベントを停止（外側クリック検出を防ぐため）
		popup.addEventListener('click', function(event) {
			event.stopPropagation();
		}, false);
		
		// ポップアップ内のマウスダウンイベントを停止（外側クリック検出を防ぐため）
		popup.addEventListener('mousedown', function(event) {
			event.stopPropagation();
		}, false);

		// 문장 번역 버튼 클릭 이벤트
		translateButton.addEventListener('click', function(event) {
			event.stopPropagation();
			if (!originalText || !originalText.trim()) {
				translationResult.textContent = '번역할 문장이 없습니다.';
				return;
			}
			translationResult.textContent = '번역 중...';
			chrome.runtime.sendMessage({
				type : "translateToKorean",
				data : originalText
			}, function(response) {
				if (!response) {
					translationResult.textContent = '번역 실패: 응답이 없습니다.';
					return;
				}
				if (response.error) {
					if (response.message === "API_KEY_NOT_SET") {
						translationResult.textContent = '번역 API 키가 설정되어 있지 않습니다.';
					} else {
						translationResult.textContent = '번역 중 오류가 발생했습니다.';
					}
					return;
				}
				if (response.translatedText) {
					translationResult.innerHTML = response.translatedText;
				} else {
					translationResult.textContent = '번역 결과가 비어 있습니다.';
				}
			});
		}, false);

		// 단어 분석 버튼 클릭 이벤트 (UI만, 기능은 추후 구현)
		tokenizeButton.addEventListener('click', function(event) {
			event.stopPropagation();
			// TODO: 각 단어를 토큰화하여 일본/한국 한자 훈/음, 예시 문장 등을 표시하는 기능 구현
			alert('단어 분석 기능은 준비 중입니다.');
		}, false);

		// 設定ポップアップを表示
		function showSettingPopup() {
			var settingPopup = document.createElement('div');
			settingPopup.classList.add('yomichan-setting-popup');

			// 背景
			var bkgdDiv = document.createElement('div');

			var bkgdLabel = document.createElement('span');
			bkgdLabel.textContent = "背景：";
			bkgdDiv.appendChild(bkgdLabel);

			var bkgdColorPicker = document.createElement('input');
			bkgdColorPicker.type = 'color';
			bkgdColorPicker.value = ymcContent.setting.backgroundColor;
			bkgdColorPicker.classList.add('popup-setting');
			bkgdColorPicker.id = 'background-color';
			bkgdDiv.appendChild(bkgdColorPicker);

			settingPopup.appendChild(bkgdDiv);

			// 漢字
			var kanjiDiv = document.createElement('div');

			var kanjiColorLabel = document.createElement('span');
			kanjiColorLabel.textContent = "漢字：";
			kanjiDiv.appendChild(kanjiColorLabel);

			var kanjiColorPicker = document.createElement('input');
			kanjiColorPicker.type = 'color';
			kanjiColorPicker.value = ymcContent.setting.kanjiColor || ymcContent.setting.wordColor || "#FFFFFF";
			kanjiColorPicker.classList.add('popup-setting');
			kanjiColorPicker.id = 'kanji-color';
			kanjiDiv.appendChild(kanjiColorPicker);

			var kanjiFontSizeInput = document.createElement('input');
			kanjiFontSizeInput.type = 'range';
			kanjiFontSizeInput.value = ymcContent.setting.kanjiFontSize || ymcContent.setting.wordFontSize || 14;
			kanjiFontSizeInput.min = ymcContent.minFontSize;
			kanjiFontSizeInput.max = ymcContent.maxFontSize;
			kanjiFontSizeInput.classList.add('popup-setting');
			kanjiFontSizeInput.id = 'kanji-font-size';
			kanjiDiv.appendChild(kanjiFontSizeInput);

			settingPopup.appendChild(kanjiDiv);

			// ふりがな
			var furiganaDiv = document.createElement('div');

			var furiganaColorLabel = document.createElement('span');
			furiganaColorLabel.textContent = "ふりがな：";
			furiganaDiv.appendChild(furiganaColorLabel);

			var furiganaColorPicker = document.createElement('input');
			furiganaColorPicker.type = 'color';
			furiganaColorPicker.value = ymcContent.setting.furiganaColor || ymcContent.setting.wordColor || "#FFFFFF";
			furiganaColorPicker.classList.add('popup-setting');
			furiganaColorPicker.id = 'furigana-color';
			furiganaDiv.appendChild(furiganaColorPicker);

			var furiganaFontSizeInput = document.createElement('input');
			furiganaFontSizeInput.type = 'range';
			var defaultFuriganaSize = ymcContent.setting.furiganaFontSize;
			if (!defaultFuriganaSize) {
				var kanjiSize = ymcContent.setting.kanjiFontSize || ymcContent.setting.wordFontSize || 14;
				defaultFuriganaSize = Math.max(ymcContent.minFontSize, kanjiSize - ymcContent.noteFontSizeDiff);
			}
			furiganaFontSizeInput.value = defaultFuriganaSize;
			furiganaFontSizeInput.min = ymcContent.minFontSize;
			furiganaFontSizeInput.max = ymcContent.maxFontSize;
			furiganaFontSizeInput.classList.add('popup-setting');
			furiganaFontSizeInput.id = 'furigana-font-size';
			furiganaDiv.appendChild(furiganaFontSizeInput);

			settingPopup.appendChild(furiganaDiv);
			
			// 漢字以外のテキスト
			var textDiv = document.createElement('div');

			var textLabel = document.createElement('span');
			textLabel.textContent = "漢字以外のテキスト：";
			textDiv.appendChild(textLabel);

			var textColorPicker = document.createElement('input');
			textColorPicker.type = 'color';
			textColorPicker.value = ymcContent.setting.textColor;
			textColorPicker.classList.add('popup-setting');
			textColorPicker.id = 'text-color';
			textDiv.appendChild(textColorPicker);

			var textFontSizeInput = document.createElement('input');
			textFontSizeInput.type = 'range';
			textFontSizeInput.value = ymcContent.setting.textFontSize;
			textFontSizeInput.min = ymcContent.minFontSize;
			textFontSizeInput.max = ymcContent.maxFontSize;
			textFontSizeInput.classList.add('popup-setting');
			textFontSizeInput.id = 'text-font-size';
			textDiv.appendChild(textFontSizeInput);

			settingPopup.appendChild(textDiv);

			// bodyに追加
			popup.appendChild(settingPopup);

			listenSettingChangeEvent();
		}

		// 設定項目を変更するイベント：該当項目を設定
		function listenSettingChangeEvent() {
			document.querySelectorAll(".popup-setting").forEach(function(elem) {
				elem.addEventListener("input", function(event) {
					let value = event.target.value;
					switch (elem.id) {
					case "background-color":
						// 背景色
						document.querySelector('.yomichan-popup').style.backgroundColor = value;
						ymcContent.setting.backgroundColor = value;
						break;
					case "text-color":
						// 漢字以外のテキストの色
						document.querySelector('.yomichan-content').style.color = value;
						ymcContent.setting.textColor = value;
						break;
					case "kanji-color":
						// 漢字の色
						document.querySelectorAll('.yomichan-content>ruby>rb').forEach(function(word) {
							word.style.color = value;
						});
						document.querySelectorAll('.yomichan-content>ruby').forEach(function(word) {
							word.style.color = value;
						});
						ymcContent.setting.kanjiColor = value;
						break;
					case "furigana-color":
						// ふりがなの色
						document.querySelectorAll('.yomichan-content>ruby>rt').forEach(function(word) {
							word.style.color = value;
						});
						ymcContent.setting.furiganaColor = value;
						break;
					case "text-font-size":
						// 漢字以外のテキストのフォントサイズ
						document.querySelector('.yomichan-content').style.fontSize = value + "px";
						resetPopupStyle();
						ymcContent.setting.textFontSize = value;
						break;
					case "kanji-font-size":
						// 漢字のフォントサイズ
						document.querySelectorAll('.yomichan-content>ruby>rb').forEach(function(word) {
							word.style.fontSize = value + "px";
						});
						document.querySelectorAll('.yomichan-content>ruby').forEach(function(word) {
							word.style.fontSize = value + "px";
						});
						// 번역 문장 영역 폰트도 한자 크기에 맞춰 변경
						var tr = document.querySelector('.yomichan-translation-result');
						if (tr) {
							tr.style.fontSize = value + "px";
						}
						resetPopupStyle();
						ymcContent.setting.kanjiFontSize = value;
						break;
					case "furigana-font-size":
						// ふりがなのフォントサイズ
						document.querySelectorAll('.yomichan-content>ruby>rt').forEach(function(word) {
							word.style.fontSize = value + "px";
						});
						resetPopupStyle();
						ymcContent.setting.furiganaFontSize = value;
						break;
					}
					// Local Storageに保存
					chrome.storage.local.set({
						'yomichanSetting' : ymcContent.setting
					}, function() {
					});
				}, false);
			});
		}

		function resetPopupStyle() {
			// 表示する内容の幅を取得し、ポップアップに設定する
			popup.style.width = maxWidth + "px";
			let yomichanContent = document.querySelector(".yomichan-content");
			let range = document.createRange();
			range.selectNodeContents(yomichanContent);
			popup.style.width = Math.ceil(Math.min(maxWidth,
					range.getBoundingClientRect().width)) + "px";
			popup.style.height = 'auto';
			window.getSelection().removeRange(range);
		}

		// 設定ポップアップを閉じる
		function closeSettingPopup() {
			document.querySelectorAll('.yomichan-setting-popup').forEach(function(popup) {
				popup.parentNode.removeChild(popup);
			});
		}
	},
	// ポップアップを閉じる
	closePopup : function() {
		let settingPopup = document.querySelector('.yomichan-setting-popup');
		if (settingPopup) {
			settingPopup.remove();
			ymcContent.settingExpand = false;
		}
		ymcContent.oldSelectionText = "";
		document.querySelectorAll('.yomichan-popup').forEach(function(popup) {
			popup.parentNode.removeChild(popup);
		});
	},
	// 選択したテキストを抽出
	getSelection : function() {
		if (window.getSelection) {
			let selection = window.getSelection();
			let selectionText = selection.toString();
			if (selection.rangeCount && selectionText != "") {
				let range = selection.getRangeAt(0);
				// ポップアップ内の選択は無視する（ポップアップ内ドラッグ時に新しいポップアップを開かないようにする）
				let popup = document.querySelector(".yomichan-popup");
				if (popup) {
					let container = range.commonAncestorContainer;
					let elem = (container.nodeType === Node.TEXT_NODE ? container.parentNode : container);
					if (popup.contains(elem)) {
						return null;
					}
				}
				let selectionRect = range.getBoundingClientRect();
				let maxWidth = document.body.clientWidth;
				let parentEl = range.commonAncestorContainer;
				while (parentEl != null
						&& (parentEl.nodeType != Node.ELEMENT_NODE || parentEl.clientWidth == 0)) {
					// ELEMENT_NODEではない場合、上層のノードを取得する
					parentEl = parentEl.parentNode;
				}
				if (parentEl != null && parentEl.nodeType == Node.ELEMENT_NODE) {
					maxWidth = parentEl.clientWidth
							- (selectionRect.left - parentEl
									.getBoundingClientRect().left);
				}
				return {
					selectionText : selectionText,
					left : selectionRect.left,
					right : selectionRect.right,
					top : selectionRect.top,
					bottom : selectionRect.bottom,
					width : selectionRect.width,
					height : selectionRect.height,
					maxWidth : maxWidth
				};
			}
		}

		return null;
	}
}

// backgroundからのメッセージを受け
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.type) {
	case 'enableYomichan':
		ymcContent.enable();
		break;
	case 'disableYomichan':
		ymcContent.disable();
		break;
	default:
	}
});

// ページをロードする際に有効／無効の状態をチェックする
chrome.runtime.sendMessage({
	type : "checkEnabled"
});
