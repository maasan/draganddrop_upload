/**
 * @author kondo
 */

$(function() {
	const PREVIEWIMAGE_WIDTH_HEIGHT_MAX = 400;
	var filesToUpload = new Array();

	//---------------------------------------------------------------------
	// 送信対象ファイル形式であることを確認する
	// ファイルがjpgまたはpdf以外の場合にはfalseを返す
	//---------------------------------------------------------------------
	function validateFiles(files) {
		var errorMessage = new String();
		for (var i = 0; i < files.length; i++) {
			// ファイルのMIMEタイプを確認
			if (!/^image\/(jpeg)$/.test(files[i].type) && 
					!/^application\/(pdf)$/.test(files[i].type))
			{
				errorMessage += "[error]ファイル名: " + files[i].name + ", 実際のMIMEタイプ: " + files[i].type + "\n";
			}

		}

		if (0 < errorMessage.length) {
				console.log(errorMessage);
				return false;
		}

		return true;
	};

	//---------------------------------------------------------------------
	// プレビューダイアログをfilesToUpload配列の先頭から１ファイル取り出して表示する
	//---------------------------------------------------------------------
	function viewPreviewDialog() {
		if (filesToUpload.length == 0) {
			// 何もしない
			return;
		};

		// filesToUpload配列の先頭から１ファイル取り出す
		var file = filesToUpload.shift();

		// 画像ファイルを読み込む準備
		var fileReader = new FileReader();
		// jpgファイルの場合
		if (/^image\/(jpeg)$/.test(file.type)) {
			fileReader.onload = function() {
				// プレビューダイアログに表示する画像の縮尺を計算する
				var previewImage = new Image();
				previewImage.src = fileReader.result;
				previewImage.onload = function() {
					var imageWidthPercent = PREVIEWIMAGE_WIDTH_HEIGHT_MAX * 100 / previewImage.width;
					var imageHeightPercent = PREVIEWIMAGE_WIDTH_HEIGHT_MAX * 100 / previewImage.height;
					var imagePercent = (imageWidthPercent < imageHeightPercent)?imageWidthPercent:imageHeightPercent; // 小さい方を選択
					var imageWidth;
					var imageHeight;
					if (100 < imagePercent) {
						imageWidth = previewImage.width;
						imageHeight = previewImage.height;
					}
					else {
						imageWidth = Math.round(previewImage.width * imagePercent / 100);
						imageHeight = Math.round(previewImage.height * imagePercent / 100);
					}

					// プレビューダイアログに画像を追加する
					var imageObject = $('<img>');
					imageObject.attr('id', "previewImage");
					imageObject.attr('src', fileReader.result);
					imageObject.attr('width', imageWidth);
					imageObject.attr('height', imageHeight);
					$('#previewDialog').append(imageObject);

					// プレビューダイアログを表示する
					$('#previewFileName').html(file.name);
					$('#previewDialog').dialog({
						bgiframe: true,
						autoOpen: true,
						width: PREVIEWIMAGE_WIDTH_HEIGHT_MAX,
						modal: true,
						buttons: {
							'OK': function() {
								// アップロードを実行する
								uploadSingleFile(file);

								// プレビューダイアログを閉じる
								$('#previewDialog').dialog('close');

								// プレビューダイアログに追加した画像を削除する
								$('#previewImage').remove();

								// プレビューダイアログを表示する処理を呼び出す
								viewPreviewDialog();
							},
							'Cancel': function() {
								// プレビューダイアログを閉じる
								$('#previewDialog').dialog('close');

								// プレビューダイアログに追加した画像を削除する
								$('#previewImage').remove();

								console.log("upload canceled. " + file);

								// プレビューダイアログを表示する処理を呼び出す
								viewPreviewDialog();
							}
						}
					});
				};
			};
		}
		// pdfファイルの場合
		else if (/^application\/(pdf)$/.test(file.type)) {
			fileReader.onload = function() {
				// プレビューダイアログにキャンバスを追加する
				var canvasObject = $('<canvas>');
				canvasObject.attr('id', "previewCanvas");
				$('#previewDialog').append(canvasObject);

				// PDFを描画する
				// PDFJS.getDocument('helloworld.pdf').then(function(pdf) {
				PDFJS.disableWorker = true; // ArrayByteとしてgetDocumentに渡す場合はこの１行が必要
				PDFJS.getDocument(fileReader.result).then(function(pdf) {
					pdf.getPage(1).then(function(page) {
						var scale = 1;
						var viewport = page.getViewport(scale);

						// var canvas = $('#previewCanvas');
						var canvas = document.getElementById('previewCanvas');
						var context = canvas.getContext('2d');
						canvas.width = viewport.width;
						canvas.height = viewport.height;

						var renderContext = {
							canvasContext: context,
							viewport: viewport
						};
						page.render(renderContext);
					});
				});

				// プレビューダイアログを表示する
				$('#previewFileName').html(file.name);
				$('#previewDialog').dialog({
					bgiframe: true,
					autoOpen: true,
					width: PREVIEWIMAGE_WIDTH_HEIGHT_MAX,
					height: PREVIEWIMAGE_WIDTH_HEIGHT_MAX * 1.5,
					modal: true,
					buttons: {
						'OK': function() {
							// アップロードを実行する
							uploadSingleFile(file);

							// プレビューダイアログを閉じる
							$('#previewDialog').dialog('close');

							// プレビューダイアログに追加したキャンバスを削除する
							$('#previewCanvas').remove();

							// プレビューダイアログを表示する処理を呼び出す
							viewPreviewDialog();
						},
						'Cancel': function() {
							// プレビューダイアログを閉じる
							$('#previewDialog').dialog('close');

							// プレビューダイアログに追加した画像を削除する
							$('#previewCanvas').remove();

							console.log("upload canceled. " + file);

							// プレビューダイアログを表示する処理を呼び出す
							viewPreviewDialog();
						}
					}
				});
			};
		}
		fileReader.onerror = function(event) {
			switch(event.target.error.code) {
				case event.target.error.NOT_FOUND_ERR:
					alert('File Not Found!');
					break;
				case event.target.error.SECURITY_ERR:
					alert('Security Error!');
					break;
				case event.target.error.NOT_READABLE_ERR:
					alert('File is not readable');
					break;
				case event.target.error.ABORT_ERR:
					break; // noop
				default:
					alert('An error occurred reading this file.');
			};

			console.log(event);
			viewErrorDialog("ファイルの読み込みに失敗しました。");
		};

		// jpgファイルの場合
		if (/^image\/(jpeg)$/.test(file.type)) {
			// 画像ファイルを読み込む
			fileReader.readAsDataURL(file);
		}
		// pdfファイルの場合
		else if (/^application\/(pdf)$/.test(file.type)) {
			// pdfファイルを読み込む
			fileReader.readAsArrayBuffer(file);
		}
	};

	//---------------------------------------------------------------------
	// 編集ダイアログを表示する
	//---------------------------------------------------------------------
	function viewEditDialog(rowKey) {
		var grid = jQuery("#filelist_table");
		var rowData = grid.jqGrid('getRowData', rowKey);

		// 編集ダイアログを設定する
		$('#editId').html(rowData.id);
		$('#editPatientName').val(rowData.patientname);
		$('#editExamDate').val(rowData.examdate);
		$('#editFileName').html(rowData.filename);

		// 編集ダイアログを表示する
		$('#editDialog').dialog({
			bgiframe: true,
			autoOpen: true,
			width: PREVIEWIMAGE_WIDTH_HEIGHT_MAX,
			modal: true,
			buttons: {
				'OK': function() {
					// 編集ダイアログの内容を取得する
					var newRowData = {
						id:rowData.id,
						patientname:$('#editPatientName').val(),
						examdate:$('#editExamDate').val(),
						filename:rowData.filename
					};

					// 編集ダイアログを閉じる
					$('#editDialog').dialog('close');

					// 編集ダイアログの内容でテーブルの内容を更新する
					var ret = grid.jqGrid('setRowData', rowKey, newRowData);
					if (!ret) {
					 alert("Set rowData error : " + rowKey);
					}

					var m = "editted from[" + rowData + "] to[" + newRowData + "]";
					window.console && console.log(m);
				},
				'Cancel': function() {
					// 編集ダイアログを閉じる
					$('#editDialog').dialog('close');

					var m = "edit canceled : ";
					window.console && console.log(m);
				}
			}
		});
	};

	//---------------------------------------------------------------------
	// エラーダイアログを表示する
	//---------------------------------------------------------------------
	function viewErrorDialog(errorMessage) {
		$('#errorMessage').html(errorMessage);
		$('#errorDialog').dialog({
			bgiframe: true,
			autoOpen: true,
			width: 300,
			modal: true,
			buttons: {
				'OK': function() {
					$('#errorDialog').dialog('close');
				}
			}
		});
	};

	//---------------------------------------------------------------------
	// ファイルをサーバーに送信する
	//---------------------------------------------------------------------
	function uploadSingleFile(file) {
		// FormDataオブジェクトを用意する
		// var fd = new FormData();
		// fd.append("file", file);
		// console.log(fd);

		// XHRで送信する
		// $.ajax({
		//		 url: "@Url.Action("upload", "file")",
		//		 type: "POST",
		//		 data: fd,
		//		 processData: false,
		//		 contentType: false
		// });

		// テーブルに１行追加する
		// var tbody = $('#filelist').children('table').children('tbody');
		var now = new Date();
		var year	= now.getFullYear();
		var month = ("0" + (now.getMonth() + 1)).slice(-2);
		var day = ("0" + (now.getDate() + 1)).slice(-2);
		var todayString = year + "/" + month + "/" + day;

		var newRowId = $("#filelist_table").getRowData().length + 1;
		var newRow = {
			id:"" + newRowId,
			patientname:"患者１",
			examdate:todayString,
			filename:file.name
		};
		jQuery("#filelist_table").jqGrid('addRowData', newRowId, newRow);
	};

	//---------------------------------------------------------------------
	// bodyへのドラッグ＆ドロップ
	//---------------------------------------------------------------------
	$("body").bind("drop", function(e) {
		// イベントのさらなる伝搬を止める
		e.stopPropagation();
		// デフォルトの処理を実行しないようにする
		e.preventDefault();
	});

	//---------------------------------------------------------------------
	// #filelistへのドラッグ＆ドロップ
	//---------------------------------------------------------------------
	var dragEnterCount = 0;
	$("#filelist").bind("drop", function(e) {
		e.stopPropagation();
		e.preventDefault();

		dragEnterCount = 0;
		$("#filelist").addClass("filelist_notareadetected");
		$("#filelist").removeClass("filelist_areadetected");
		$("#filelist table").removeClass("filelist_mouseover");

		// File APIが実装されていない場合
		if (!(window.File)) {
			viewErrorDialog("File APIが実装されているブラウザを使用して下さい。");
			return;
		}

		// ドロップされたファイルの情報を取得する
		var files = e.originalEvent.dataTransfer.files;

		// アップロード可能ファイルかどうか確認する
		if (validateFiles(files)) {
			// アップロード用ファイルの配列に追加する
			// filesToUpload.concat(files);
			for (var i = 0; i < files.length; i++) {
				filesToUpload.push(files[i]);
			};

			// プレビューダイアログを表示する
			viewPreviewDialog();
		}
		else {
			// エラーダイアログを表示する
			viewErrorDialog("jpgファイルまたはpdfファイルのみ追加可能です。");
		};
	})
	.bind("dragenter", function(e) {
		e.stopPropagation();
		e.preventDefault();

		if (dragEnterCount <= 0) {
			$("#filelist").removeClass("filelist_notareadetected");
			$("#filelist").addClass("filelist_areadetected");
			$("#filelist table").addClass("filelist_mouseover");
			console.log("dragenter");
		}
		++dragEnterCount;
	})
	.bind("dragover", function(e) {
		e.stopPropagation();
		e.preventDefault();
	})
	.bind("dragleave", function(e) {
		e.stopPropagation();
		e.preventDefault();

		--dragEnterCount;
		if (dragEnterCount <= 0) {
			$("#filelist").addClass("filelist_notareadetected");
			$("#filelist").removeClass("filelist_areadetected");
			$("#filelist table").removeClass("filelist_mouseover");
			console.log("dragleave");
		}
	});

	//---------------------------------------------------------------------
	// jQuery Context Menuの設定
	//---------------------------------------------------------------------
	$.contextMenu({
		selector:"#filelist",
		callback:function(key, options) {
			// var m = "clicked:" + key;
			// window.console && console.log(m) || alert(m);

			if (key == "edit") {
				contextMenuEdit();
			}
			else if (key == "delete") {
				contextMenuDelete();
			}
		}, 
		items: {
			"edit":{name:"Edit", icon:"edit"},
			"sep1":"--------",
			"delete": {name:"Delete", icon:"delete"}
		}
	});

	function contextMenuEdit(){
		var grid = jQuery("#filelist_table");
		var rowKey = grid.getGridParam("selrow");
		if (rowKey) {
			viewEditDialog(rowKey);
		}
		else {
			alert("No rows are selected");
		}
	};

	function contextMenuDelete(){
		var grid = jQuery("#filelist_table");
		var rowKey = grid.getGridParam("selrow");
		if (rowKey) {
			$('#deleteConfirmDialog').dialog({
				bgiframe: true,
				autoOpen: true,
				width: 300,
				modal: true,
				buttons: {
					'OK': function() {
						$('#deleteConfirmDialog').dialog('close');

						var su = grid.jqGrid('delRowData', rowKey);
						if(su) {
							var m = "row deleteed : " + rowKey;
							window.console && console.log(m);
						} 
						else {
							alert("Allready deleted or not in list : " + rowKey);
						}
					},
					'Cancel': function() {
						$('#deleteConfirmDialog').dialog('close');

						var m = "delete row canceled : " + rowKey;
						window.console && console.log(m);
					}
				}
			});
		}
		else {
			 alert("No rows are selected");
		}
	};
});

;(function(window, $){
	var document = window.document;
	$(document).ready( function() {
		//---------------------------------------------------------------------
		// jqgridの設定
		//---------------------------------------------------------------------
		jQuery("#filelist_table").jqGrid({
			datatype: "local",
			height: 250,
			colNames: ['ID','患者名', '検査日', 'ファイル名'],
			colModel: [
				{name:'id',index:'id', width:60, sorttype:"int"},
				{name:'patientname',index:'patientname', width:100},
				{name:'examdate',index:'examdate', width:90, sorttype:"date"},
				{name:'filename',index:'filename', width:100}
			],
			multiselect: false,
			caption: "ファイル一覧"
		});
		var mydata = [
			{id:"1", patientname:"患者１", examdate:"2007/10/01", filename:"検査結果１"},
			{id:"2", patientname:"患者１", examdate:"2007/10/02", filename:"◯◯画像"},
			{id:"3", patientname:"患者１", examdate:"2007/09/01", filename:"その他画像"}
		];
		for(var i=0;i<=mydata.length;i++) {
			jQuery("#filelist_table").jqGrid('addRowData',i+1,mydata[i]);
		}
	});
}(this, jQuery));
