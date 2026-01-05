importScripts("./yomichan.js")
importScripts("./translator.js")


// 初期化
ymcMain.init();

// ブラウザの上部のアイコンをクリックするイベント：有効／無効状態を設定
chrome.action.onClicked.addListener(ymcMain.onClicked);
// タブ切り替えイベント:有効／無効状態をチェックし、contentに送信
// chrome.tabs.onActivated.addListener(ymcMain.onSelectionChanged);

// contentからのメッセージを受ける
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.type) {
	case 'checkEnabled':
		// 有効／無効の状態をcontentに送信する
		ymcMain.sendEnabled(sender.tab.id);
		break;
	case 'getFurigana':
		// ふりがなを表示する要求
		ymcMain.getFurigana(request.data, sendResponse);
		break;
	case 'translateToKorean':
		// 選択した文を韓国語に翻訳する要求
		if (!request.data) {
			sendResponse({ translatedText: "" });
			break;
		}
		translator.translateToKorean(request.data).then(function(result) {
			sendResponse({
				translatedText : result
			});
		}).catch(function(error) {
			console.error("翻訳中にエラーが発生しました: ", error);
			sendResponse({
				error : true,
				message : (error === "API_KEY_NOT_SET")
						? "API_KEY_NOT_SET"
						: ((error && error.toString) ? error.toString() : "translation error")
			});
		});
		// 非同期で応答することを示す
		return true;
		break;
	default:
		console.log("認識できないタイプ.request=" + request);
	}
});