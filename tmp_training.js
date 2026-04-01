// トレーニング画面
//————————————————————————————————————————————————————————————————
let trainingData = [] //トレーニング情報
let selectAllTraining = JSON.parse(localStorage.getItem('data')) //選択トレーニング
let selectCurrentTraining = selectAllTraining ? selectAllTraining.find(item => item.status === 'active') : {} //現在のトレーニング
let cond1 = localStorage.getItem('cond1') == 'null' ? null : localStorage.getItem('cond1') //レベル取得
let cond2 = localStorage.getItem('cond2') == 'null' ? null : localStorage.getItem('cond2') //ブロック、たてよこ、声・絵になる文取得
let cond3 = localStorage.getItem('cond3') == 'null' ? null : localStorage.getItem('cond3') //タイトル
let TextFormat = localStorage.getItem('TextFormat') == 'null' ? null : localStorage.getItem('TextFormat') //たてよみ、よこよみ
let lang = localStorage.getItem('lang')  //言語取得
let path = $(location).attr('pathname') //現在のURLを整形取得
let audioBuffer
let audioContext
let countId //カウント処理（クリック音）ID
let audioId //カウント処理（クリック音）ID
let speedChk = false //スピードチェック中フラグ
let startFlg = false //スタートフラグ
let row = 1 //高速よみ練習マーカー行
let split = 1 //高速よみ練習マーカー列
let maxRow //高速よみ練習最大行数
let maxWord //高速よみ練習最大文字数
let verticalSplitWord = 24 //たてブロック1行最大文字数
let horizontalSplitWord = 30 //よこブロック1行最大文字数
let complete = 0 //瞬間よみ練習問題数
let textCount //テキスト文字数
let textArray = [] //高速よみ練習文章分割
let pageNumber = 0 //練習ページ数
let countMin = 60 //初期カウント数
let countMax = 260 //最大カウント数
let countSpan = 20 //カウント増減値
let countNumber = 0 //カウント回数
let countArray = {
    verticalBlock: {
        2: { 60: 10, 80: 10, 100: 20, 120: 20, 140: 20, 150: 20, 160: 20, 170: 20, 180: 20, 190: 20, 200: 20, 210: 20, 220: 20, 230: 20, 240: 20, 250: 20, 260: 20 },
        3: { 60: 12, 80: 12, 100: 12, 120: 12, 140: 12, 150: 12, 160: 24, 170: 24, 180: 24, 190: 24, 200: 24, 210: 24, 220: 24, 230: 24, 240: 24, 250: 24, 260: 24 },
        4: { 60: 8, 80: 8, 100: 8, 120: 16, 140: 16, 150: 16, 160: 16, 170: 16, 180: 16, 190: 16, 200: 32, 210: 32, 220: 32, 230: 32, 240: 32, 250: 32, 260: 32 },
        5: { 60: 10, 80: 10, 100: 10, 120: 10, 140: 10, 150: 20, 160: 20, 170: 20, 180: 20, 190: 20, 200: 20, 210: 30, 220: 30, 230: 30, 240: 30, 250: 30, 260: 30 }
    },
    horizontalBlock: {
        2: { 60: 12, 80: 12, 100: 12, 120: 12, 140: 12, 160: 12, 170: 12, 180: 12, 190: 12, 200: 24, 210: 24, 220: 24, 230: 24, 240: 24, 250: 24, 260: 24 },
        3: { 60: 15, 80: 18, 100: 18, 120: 18, 140: 18, 160: 18, 170: 18, 180: 18, 190: 18, 200: 18, 210: 18, 220: 18, 230: 18, 240: 18, 250: 18, 260: 18 },
        4: { 60: 12, 80: 12, 100: 12, 120: 12, 140: 24, 160: 24, 170: 24, 180: 24, 190: 24, 200: 24, 210: 24, 220: 24, 230: 24, 240: 24, 250: 24, 260: 24 }
    },
    // todo:視点移動と本よみはカウント速度上昇が異なることが想定されるため、別途設定(本よみと同一の値で仮置き中)
    viewpoint: {
        2: { 60: 10, 80: 10, 100: 20, 120: 20, 140: 20, 150: 20, 160: 20, 170: 20, 180: 20, 190: 20, 200: 20, 210: 20, 220: 20, 230: 20, 240: 20, 250: 20, 260: 20 },
        3: { 60: 12, 80: 12, 100: 12, 120: 12, 140: 12, 150: 12, 160: 24, 170: 24, 180: 24, 190: 24, 200: 24, 210: 24, 220: 24, 230: 24, 240: 24, 250: 24, 260: 24 },
        4: { 60: 8, 80: 8, 100: 8, 120: 16, 140: 16, 150: 16, 160: 16, 170: 16, 180: 16, 190: 16, 200: 32, 210: 32, 220: 32, 230: 32, 240: 32, 250: 32, 260: 32 },
        5: { 60: 10, 80: 10, 100: 10, 120: 10, 140: 10, 150: 20, 160: 20, 170: 20, 180: 20, 190: 20, 200: 20, 210: 30, 220: 30, 230: 30, 240: 30, 250: 30, 260: 30 }
    }
}
let beforeStyle
let afterStyle


// 初期表示
//————————————————————————————————————————————————————————————————
window.addEventListener('DOMContentLoaded', function () {
    // トレーニングの場合
    if (!path.includes('Measure')) {
        modeTraining()
        // 読書スピード測定の場合
    } else {
        modeMeasure()
    }
})

// 読書スピード測定orトレーニング
//————————————————————————————————————————————————————————————————
// 読書スピード測定
function modeMeasure() {
    // エラー処理
    error()

    // テキスト取得処理回数カウント
    let retryCount = 0;

    // text.jsonからファイル数取得
    let jsonUrl = contentPath + 'text/text.json';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', jsonUrl, false);
    xhr.send();
    let jsonData = JSON.parse(xhr.responseText.replace(/\n/g, "").replace(/\r/g, "")).text;
    let MaxFileNo;

    switch (cond1) {
        case "1":
            MaxFileNo = jsonData.lv1;
            break;
        case "2":
            MaxFileNo = jsonData.lv2;
            break;
        case "3":
            MaxFileNo = jsonData.lv3;
            break;
    }

    function getTextData() {
        retryCount++;
        let FileNo = Math.floor(Math.random() * (MaxFileNo) + 1).toString();
        console.log('example_' + lang + '_' + cond1 + '-' + FileNo + '.txt');
        $.get({
            // ファイル名変更に伴い変更
            //url: contentPath + 'text/example_' + lang + '_' + cond1 + '.txt',
            url: contentPath + 'text/example_' + lang + '_' + cond1 + '-' + FileNo + '.txt',
            // dataType: 'json', //必須。json形式で返すように設定
        }).done(function (data) {
            // 通信成功時の処理を記述
            textCount = data.replace(/\n/g, "").length
            let article = []
            article[0] = data
            trainingData.question = article
            trainingData.type = 'measure'
            switch (cond2) {
                case '1':
                    trainingData.code = 'vertical'
                    maxRow = 11
                    splitSentence(verticalSplitWord)
                    break
                case '2':
                    trainingData.code = 'horizontal'
                    maxRow = 9
                    splitSentence(horizontalSplitWord)
                    break
            }
            if (textArray.length == 1) {
                $('#side_btn').html('<button id="finish" class="el_btn el_btn__red el_btn__rounded el_btn__size__side_main"><img src="' + contentPath + 'images/icon/icon_btn_complete_red.svg">読み終わり</button>')
            } else {
                $('#side_btn').html('<button id="page" onclick="page()" class="el_btn el_btn__yellow el_btn__rounded el_btn__size__side_main">次のページへ<img src="' + contentPath + 'images/icon/icon_btn_next_yellow.svg"></button>')
            }
            $('#page_number').html('1 / ' + textArray.length)
            // タイトル表示
            title()
            // 画面幅変更処理
            viewResize(trainingData.type, trainingData.code)
            // 測定開始
            countStart(null, trainingData)
        })
            .fail(function () {
                // 通信失敗時の処理を記述

                // 三回取得処理を試みて失敗した場合はエラー表示
                if (retryCount >= 3) {
                    alert('通信失敗')
                }
                else {
                    getTextData();
                }
            })
    }
    getTextData();
}

// トレーニング
function modeTraining() {
    // エラー処理
    error()
    // 初期表示
    init()
    // Ajax通信を開始
    $.ajax({
        type: 'post',
        url: $('#ajaxTraining').val(),
        data: {
            id: selectCurrentTraining.id,
            cond1: cond1,
            cond2: cond2,
            cond3: cond3,
        },
        dataType: 'json', //必須。json形式で返すように設定
    }).done(function (data) {
        // 通信成功時の処理を記述
        console.log(data)
        trainingData = data
        // タイトル表示
        title()
        $('#timer').html(("0" + selectCurrentTraining.minutes) + ":" + ("00").slice(-2))
        // トレーニング累計時間表示
        totalTrainingTime(data['total_time'])
        // 各種トレーニング画面初期表示
        switch (trainingData.type) {
            case 'flash':
                initFlash()
                break
            case 'fast':
                initFast()
                break
            case 'reading':
                initReading()
                break
        }
        // 画面幅変更処理
        viewResize(trainingData.type, trainingData.code)
    })
        .fail(function () {
            // 通信失敗時の処理を記述
            alert('通信失敗')
            window.location.href = rootPath + 'Training/' + selectCurrentTraining.type + 'Mode' //トレーニングモード選択に遷移
        })
}

// 画面表示
//————————————————————————————————————————————————————————————————
// 初期表示
function init() {
    let str = ''
    $.each(selectAllTraining, function (key, obj) {
        // ヘッダー選択トレーニング表示
        str += headerObj(obj.img, obj.minutes, obj.status)
    })
    // 要素追加
    $("#select").append(str);
}

// タイトル表示
function title() {
    let title
    let resultTitle
    // トレーニングの種別
    switch (trainingData.type) {
        case 'flash':
            if (trainingData.code == 'random') {
                title = '<h2>' + trainingData.name + '<span>レベル' + cond1 + '</span></h2>'
                resultTitle = '「' + trainingData.name + '（レベル' + cond1 + '）」が終了しました。'
            } else {
                if (cond2 == 1) {
                    title = '<h2>' + trainingData.name + '<span>レベル' + cond1 + ' 声になる文</span></h2>'
                    resultTitle = '「' + trainingData.name + '（レベル' + cond1 + ' 声になる文）」が終了しました。'
                } else {
                    title = '<h2>' + trainingData.name + '<span>レベル' + cond1 + ' 絵になる文</span></h2>'
                    resultTitle = '「' + trainingData.name + '（レベル' + cond1 + ' 絵になる文）」が終了しました。'
                }
            }
            break
        case 'fast':
            title = '<h2>' + trainingData.name + '<span>レベル' + cond1 + ' 1行' + cond2 + 'ブロック</span></h2>'
            resultTitle = '「' + trainingData.name + '（レベル' + cond1 + ' 1行' + cond2 + 'ブロック）」が終了しました。'
            break
        case 'reading':
            title = '<h2>' + trainingData.name + '</h2>'
            resultTitle = '「' + trainingData.name + '」が終了しました。'
            break
        case 'measure':
            if (lang == 'ja') {
                title = '<h2>読書スピード測定<span>日本語</span></h2>'
                resultTitle = '「読書スピード測定（日本語）」が終了しました。'
            } else if (lang == 'en') {
                title = '<h2>読書スピード測定<span>英語</span></h2>'
                resultTitle = '「読書スピード測定（英語）」が終了しました。'
            }
            break
    }
    // ヘッダー部分要素追加
    $('#title').attr('href', 'javascript:void(0)')
    $('#title').attr('onclick', 'stop()')
    $("#title").append(title)
    $("#resultTitle").append(resultTitle)
}

// 瞬間よみ練習画面表示
function initFlash() {
    $('#next').remove()
    countStart(selectCurrentTraining.minutes, trainingData)
}

// 高速よみ練習画面表示
function initFast() {
    $('#count').html(countMin)
    $('.content_box').css('opacity', '0.4')
    $('#content_body').html('カウントの速さを設定をしてからスタートを押してください。')
    checkFinBtn = $('#checkFinish').remove()
    switch (cond2) {
        case '2':
            $('.maker_box').css('grid-template-columns', '1fr 1fr')
            break
        case '3':
            $('.maker_box').css('grid-template-columns', '1fr 1fr 1fr')
            break
        case '4':
            $('.maker_box').css('grid-template-columns', '1fr 1fr 1fr 1fr')
            break
    }
    switch (trainingData.code) {
        case 'verticalBlock':
            maxWord = verticalSplitWord / Number(cond2)
            maxRow = 11
            splitSentence(verticalSplitWord)
            beforeStyle = { 'background-color': 'transparent', 'height': 'auto', 'position': 'relative', 'top': '0%' }
            afterStyle = { 'background-color': '#ffe5e5', 'height': '140%', 'position': 'relative', 'top': '-20%' }
            break
        case 'horizontalBlock':
            maxWord = horizontalSplitWord / Number(cond2)
            maxRow = 9
            splitSentence(horizontalSplitWord)
            beforeStyle = { 'background-color': 'transparent', 'width': 'auto', 'position': 'relative', 'left': '0%' }
            afterStyle = { 'background-color': '#ffe5e5', 'width': '140%', 'position': 'relative', 'left': '-20%' }
            break
    }
    completeHTML(cond2, countMin)
    let str = ''
    for (let i = 1; i <= maxRow; i++) {
        for (let j = 1; j <= cond2; j++) {
            str += '<div id="' + i + '_' + j + '"></div>'
        }
    }
    $('.maker_box').append(str)
}

// 高速よみ練習（本よみ等）画面表示
function initReading() {
    //countSpan = 5
    var block = 0;
    /*$('label[for="switch-1"]').addClass('is_disable')*/
    /*$('label[for="switch-2"]').addClass('is_disable')*/
    /*$('input[name="switch-radio"]:radio').prop('disabled', true)*/
    saveBtn = $('#saveSpeed').remove()
    checkFinBtn = $('#checkFinish').remove()
    // たてよみ、よこよみで「列」と「行」の単位を切り替える
    let unit = "";
    let image = "";
    if (TextFormat == 1) {
        unit = "列";
    }
    else if (TextFormat == 2) {
        unit = "行";
        image = "h_";
    }

    switch (trainingData.code) {
        case 'viewpoint':
            $('.el_timer').remove()
            $('#count').html(countMin)
            $('#step1 .el_count__body').addClass('book')
            $('#step2').removeClass('is_disable')
            $('#setting1').html('<img src="' + contentPath + 'images/icon_setteing_wordcount_' + image + 'blue.svg"><p>1' + unit + 'の文字数<small>（一番長い）</small></p>')
            $('#setting2').html('<img src="' + contentPath + 'images/icon_setteing_numberline_' + image + 'blue.svg"><p>' + unit + '数</p>')
            $('#setting3').html('<img src="' + contentPath + 'images/icon_setteing_viewpoint_' + image + 'blue.svg"><p>視点の数<small>（1' + unit + 'あたり）</small></p>')
            str = '</div>'
            str += '<div class="el_enter__box">'
            str += '<div class="el_enter__up" onclick="count_up(\'v_one\',\'view\')"></div>'
            str += '<div id="v_one" class="hp_font__arial el_enter__number">2</div>'
            str += '<div class="el_enter__down" onclick="count_down(\'v_one\',\'view\')"></div>'
            str += '</div>'
            block = 2;
            break
        case 'book':
            $('.el_timer').remove()
            // ------------------ 今後使う可能性ありのため残し --------------------
            $('#count').html(countMin)
            $('#step1 .el_count__body').addClass('book')
            $('#step2').removeClass('is_disable')
            // ------------------------------------------------------------------
            $('#setting1').html('<img src="' + contentPath + 'images/icon_setteing_wordcount_' + image + 'blue.svg"><p>1' + unit + 'の文字数<small>（一番長い）</small></p>')
            $('#setting2').html('<img src="' + contentPath + 'images/icon_setteing_numberline_' + image + 'blue.svg"><p>' + unit + '数</p>')
            $('#setting3').html('<img src="' + contentPath + 'images/icon_setteing_viewpoint_' + image + 'blue.svg"><p>視点の数<small>（1' + unit + 'あたり）</small></p>')
            str = '</div>'
            str += '<div class="el_enter__box">'
            str += '<div class="el_enter__up" onclick="count_up(\'v_one\',\'view\')"></div>'
            str += '<div id="v_one" class="hp_font__arial el_enter__number">2</div>'
            str += '<div class="el_enter__down" onclick="count_down(\'v_one\',\'view\')"></div>'
            str += '</div>'
            block = 2;
            break
        case 'flip':
            $('#countBox').remove() //06/10修正分 追加
            $('#method_2').html('読む範囲の「1' + unit + 'の文字数（一番長い）」と「1ページの' + unit + '数」「ページの総数」をそれぞれ設定してください。')
            $('#method_3').html('②で設定した範囲をカウントに合わせて読んでください。<br>少し読み辛くなったら「読み終わり」ボタンを押すと読書スピードが記録されます。')
            $('.el_time__long').remove()
            $('#step2').remove()
            $('#setting1').html('<img src="' + contentPath + 'images/icon_setteing_wordcount_' + image + 'blue.svg"><p>1' + unit + 'の文字数<small>（一番長い）</small></p>')
            $('#setting2').html('<img src="' + contentPath + 'images/icon_setteing_numberline_' + image + 'blue.svg"><p>1ページの' + unit + '数</p>')
            $('#setting3').html('<img src="' + contentPath + 'images/icon_setteing_page_' + image + 'blue.svg"><p>ページの総数</small></p>')
            str = '<div class="el_enter__box">'
            str += '<div class="el_enter__up" onclick="count_up(\'p_hundred\')"></div>'
            str += '<div id="p_hundred" class="hp_font__arial el_enter__number">0</div>'
            str += '<div class="el_enter__down" onclick="count_down(\'p_hundred\')"></div>'
            str += '</div>'
            str += '<div class="el_enter__box">'
            str += '<div class="el_enter__up" onclick="count_up(\'p_ten\')"></div>'
            str += '<div id="p_ten" class="hp_font__arial el_enter__number">0</div>'
            str += '<div class="el_enter__down" onclick="count_down(\'p_ten\')"></div>'
            str += '</div>'
            str += '<div class="el_enter__box">'
            str += '<div class="el_enter__up" onclick="count_up(\'p_one\')"></div>'
            str += '<div id="p_one" class="hp_font__arial el_enter__number">1</div>'
            str += '<div class="el_enter__down" onclick="count_down(\'p_one\')"></div>'
            str += '</div>'
            break
    }

    // completeHTML(block, countMax)
    completeHTML(block, countMin)
    $('#setting3_box').append(str)
}

// 読書スピード表示
function completeHTML(block, count) {
    // トレーニングの種別
    switch (trainingData.type) {
        case 'flash':
            $('#complete').html(complete)
            $('#result').html(complete)
            break
        case 'fast':
            $('#complete').html((count * maxWord).toLocaleString())
            break
        case 'reading':
            if (isNaN(Math.round(count * (Number($('#w_ten').html() + $('#w_one').html()) / block)))
                || !isFinite(Math.round(count * (Number($('#w_ten').html() + $('#w_one').html()) / block)))) {
                $('#complete').html('')
            } else {
                $('#complete').html((Math.round(count * (Number($('#w_ten').html() + $('#w_one').html()) / block))).toLocaleString())
            }
            break
    }
}

// カウント処理
//————————————————————————————————————————————————————————————————
// カウント自動・手動切替え
$(document).on("change", 'input[name="switch-radio"]:radio', function () {
    let value = $(this).val()
    if (trainingData.type == 'reading') {
        cond2 = Number($('#v_one').html())
    }
    // 自動の場合速さチェック非表示
    if (value == 0) {
        $('#count').html(countMin)
        completeHTML(cond2, countMin)
        $('.el_count__box').addClass('is_disable')
        $('.el_count__check').removeClass('is_disable')
    } else if (value == 1) {
        $('.el_count__box').removeClass('is_disable')
        $('.el_count__check').addClass('is_disable')
    }
})

// カウントアップ
function up() {
    currentCount = Number($('#count').html())
    if (currentCount < countMax) {
        if (trainingData.code == 'horizontalBlock') {
            if (currentCount >= 160) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        } else if (trainingData.code == 'viewpoint') {
            // todo:本よみと視点移動で別のカウントアップの設定(本よみと同一の値で仮置き中)
            if (currentCount >= 140) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        } else {
            if (currentCount >= 140) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        }
        $('#count').html(currentCount + countSpan)
        completeHTML(cond2, currentCount + countSpan)
        if (speedChk || startFlg) {
            clearInterval(countId)
            clearInterval(audioId)
            countClick()
        }
    }
}

// カウントダウン
function down() {
    currentCount = Number($('#count').html())
    if (currentCount > countMin) {
        if (trainingData.code == 'horizontalBlock') {
            if (currentCount > 160) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        } else if (trainingData.code == 'viewpoint') {
            // todo:本よみと視点移動で別のカウントダウンの設定(本よみと同一の値で仮置き中)
            if (currentCount > 140) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        } else {
            if (currentCount > 140) {
                countSpan = 10
            } else {
                countSpan = 20
            }
        }
        $('#count').html(currentCount - countSpan)
        completeHTML(cond2, currentCount - countSpan)
        if (speedChk || startFlg) {
            clearInterval(countId)
            clearInterval(audioId)
            countClick()
        }
    }
}

// 音源再生
function audioInterval() {
    audioId = setInterval(function () {
        // スピードチェック中でないかつ自動の場合（スタートを押しているとき）
        if (paused) {
            return
        }
        // 音を再生
        if (audioBuffer) {
            const source = audioContext.createBufferSource()
            source.buffer = audioBuffer
            source.connect(audioContext.destination)
            source.start(0)
        }
    }, (60 / displayCount * 1000))
}

// カウント増加処理
function countInterval() {
    countId = setInterval(function () {
        // スピードチェック中でないかつ自動の場合（スタートを押しているとき）
        if (!speedChk && value == 0) {
            if (paused) return

            // 高速読み、視点移動、本読みでカウント上昇を分けるため、分岐処理を変更
            countTimes = trainingData.type == 'fast' || trainingData.code == 'viewpoint' ? countArray[trainingData.code][cond2][displayCount] : countArray['verticalBlock'][cond2][displayCount];

            countSpan = 20
            if (countNumber < countTimes) {
                countNumber++
            } else {
                if (displayCount == countMax) {
                    countSpan = 20
                    // 2024/04/19 追記
                    // 速度が最大の次は最小値に戻るため、「記録を保存」ボタンの押下がなければ最大値を結果として取得する
                    if ($('#saveBtnClick').val() == 'false') {
                        $('#saveBtnClick').val('true');
                        $('#result').html($('#complete').html());
                    }
                    // 2024/04/19 追記ここまで
                    $('#count').html(countMin)
                    displayCount = Number($('#count').html())
                } else {
                    if (trainingData.code == 'horizontalBlock') {
                        if (displayCount >= 160) {
                            countSpan = 10
                        }
                    } else if (trainingData.code == 'viewpoint') {
                        // todo:本よみと視点移動で別のカウントアップの設定(本よみと同一の値で仮置き中)
                        if (displayCount >= 140) {
                            countSpan = 10
                        }
                    } else {
                        if (displayCount >= 140) {
                            countSpan = 10
                        }
                    }
                    $('#count').html(displayCount + countSpan)
                    displayCount += countSpan
                }
                completeHTML(cond2, displayCount)
                countNumber = 1
                clearInterval(countId)
                clearInterval(audioId)
                countClick()
            }
        } else {
            if (paused) return
        }
        //06/10修正分 追加 Start
        if (trainingData.type == 'fast') { 
            makerPosition()
        }
        //06/10修正分 追加 End
        //06/10修正分 コメントアウト 
        //makerPosition()
    }, (60 / displayCount * 1000))
}

// 並列処理
async function parallelProcessing() {
    await Promise.all([audioInterval(), countInterval()])
}

// カウント処理（クリック音）
function countClick() {
    value = $('input[name="switch-radio"]:checked').val()
    displayCount = Number($('#count').html())
    // トレーニングの種別
    switch (trainingData.type) {
        case 'fast':
            parallelProcessing()
            break
        case 'reading':
            // viewpointでもvalueの設定が行われるためflipのみ0に固定
            if (trainingData.code == 'flip') {
                value = 0 // 自動・手動を消しているため設定
            }
            cond2 = Number($('#v_one').html())
            parallelProcessing()
            break
    }

}

// 高速よみ練習（本よみ、視点移動、めくりよみ）範囲設定
//————————————————————————————————————————————————————————————————
// 範囲設定処理
function countEvent() {
    // めくりよみの場合
    if (trainingData.code == 'flip') {
        // 文字数、行数、ページ数が指定されているか
        if (($('#w_one').html() > 0 || $('#w_ten').html() > 0) && ($('#r_one').html() > 0 || $('#r_ten').html() > 0) && ($('#p_one').html() > 0 || $('#p_ten').html() > 0 || $('#p_hundred').html() > 0)) {
            $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_yellow.svg')
            $('#start').removeClass('is_disable')
            $('#start').prop('disabled', false)
        } else {
            $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_white.svg')
            $('#start').addClass('is_disable')
            $('#start').prop('disabled', true)
        }
        // 本よみ、視点移動の場合
    } else {
        // 文字数、行数が指定されているか
        if (($('#w_one').html() > 0 || $('#w_ten').html() > 0) && ($('#r_one').html() > 0 || $('#r_ten').html() > 0)) {
            $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_yellow.svg')
            $('#start').removeClass('is_disable')
            $('#start').prop('disabled', false)
            $('label[for="switch-1"]').removeClass('is_disable')
            $('label[for="switch-2"]').removeClass('is_disable')
            $('input[name="switch-radio"]:radio').prop('disabled', false)
            cond2 = Number($('#v_one').html())
            completeHTML(cond2, $('#count').html())
        } else {
            $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_white.svg')
            $('#start').addClass('is_disable')
            $('#start').prop('disabled', true)
            $('label[for="switch-1"]').addClass('is_disable')
            $('label[for="switch-2"]').addClass('is_disable')
            $('input[name="switch-radio"]:radio').prop('disabled', true)
            $('#count').html(countMin)
            $('#complete').html('')
        }
    }
}

// マーカー移動処理
//————————————————————————————————————————————————————————————————
function makerPosition() {
    if (split > cond2) {
        $('#' + row + '_' + (split - 1) + '').css(beforeStyle)
        split = 1
        row++
        if (row > maxRow || row > textArray[pageNumber].length) {
            row = 1
            split = 1
            $('#' + row + '_' + split + '').css(afterStyle)
            split++
            if (textArray[pageNumber + 1] != null) {
                pageNumber++
            } else {
                pageNumber = 0
            }
            // 速さチェック中じゃないとき
            if (!speedChk) {
                $('#page_number').html((pageNumber + 1) + ' / ' + textArray.length)
                question(pageNumber) // 出題文整形処理
                view() // 問題表示
            }
        } else {
            $('#' + row + '_' + split + '').css(afterStyle)
            split++
        }
    } else {
        $('#' + row + '_' + split + '').css(afterStyle)
        $('#' + row + '_' + (split - 1) + '').css(beforeStyle)
        split++
    }
}

// ボタン処理
//————————————————————————————————————————————————————————————————
// 瞬間よみ練習もう一度表示
function retry() {
    if ($('#retry').hasClass("is_disable") == false) view()
}

// 瞬間よみ練習解答表示
function answer() {
    //トレーニングの設定でカウントダウンするかつ声かけアドバイスする場合
    if ($('input[name="countdown-radio"]:checked').val() == 1 && $('input[name="advice-radio"]:checked').val() == 1) {
        // オーディオ再生
        adviceAudio()
    }
    if ($('#answer').hasClass("is_disable") == false) {
        $('#retry').addClass("is_disable")
        $('#retry').prop("disabled", true)
        answerBtn = $('#answer').remove()
        $('#side_btn').append('<button id="next" onclick="next()" class="el_btn el_btn__yellow el_btn__rounded el_btn__size__side_main">次の問題へ<img src="' + contentPath + 'images/icon/icon_btn_next_yellow.svg"></button>')
        $('.content_box').css('opacity', '1')
        $('#content_body').html('<div>' + textAnswer + '</div>' + textQuestion)
        complete++
        completeHTML(0, 0)
    }
}

// 瞬間よみ練習次の問題表示
function next() {
    $('#next').remove()
    $('#side_btn').append(answerBtn)
    question() // 出題文整形処理
    view() // 問題表示
}

// 速さチェック処理
function check() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    // オーディオファイルの読み込み
    fetch(contentPath + 'sounds/s_tick.mp3')
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data, function (decodedData) {
            audioBuffer = decodedData
            // 音声ファイルの読み込みが完了した後にメトロノームを開始
            // 速さチェック中のとき
            if (speedChk) {
                clearInterval(countId)
                clearInterval(audioId)
                pageNumber = 0
                speedChk = false
                $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_yellow.svg')
                $('#start').removeClass('is_disable')
                $('#start').prop('disabled', false)
                $('.el_speed_check').addClass('is_disable')
                $('label[for="switch-1"]').removeClass('is_disable')
                $('input[name="switch-radio"]:radio').prop('disabled', false)
                checkFinBtn = $('#checkFinish').remove()
                $('#el_count__box').append(checkStrBtn)
                if (trainingData.type == 'fast') {
                    split = 1
                    row = 1
                    $('.content_box').removeClass('vertical')
                    $('#content_body').removeClass('horizon')
                    $('.content_box').css('opacity', '0.4')
                    $('#content_body').html('カウントの速さを設定をしてからスタートを押してください。')
                    $('.maker_box').children('div').css('background-color', 'transparent')
                }
                $('.el_enter').removeClass('is_disable')
            } else {
                countClick()
                speedChk = true
                $('#start').children('img').attr('src', contentPath + 'images/icon/icon_btn_start_white.svg')
                $('#start').addClass('is_disable')
                $('#start').prop('disabled', true)
                $('.el_speed_check').removeClass('is_disable')
                $('label[for="switch-1"]').addClass('is_disable')
                $('input[name="switch-radio"]:radio').prop('disabled', true)
                checkStrBtn = $('#checkStart').remove()
                $('#el_count__box').append(checkFinBtn)
                if (trainingData.type == 'fast') checkStart(trainingData)
                $('.el_enter').addClass('is_disable')
            }
        }))
        .catch(error => console.error('Error loading audio file:', error))
}

// スタート実行処理
function start() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    // オーディオファイルの読み込み
    fetch(contentPath + 'sounds/s_tick.mp3')
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data, function (decodedData) {
            audioBuffer = decodedData
            startFlg = true
            // 音声ファイルの読み込みが完了した後にメトロノームを開始
            countStart(selectCurrentTraining.minutes, trainingData)
            // めくりよみ以外
            if (trainingData.code != 'flip') countClick()
            $('#page_number').removeClass('is_disable')
            $('#stop').removeClass('is_disable')
            $('#stop').attr('onclick', 'stop()')
            $('#start').remove()
            $('input[name="switch-radio"]:radio').prop('disabled', true)
            // ------------------ 今後使う可能性ありのため残し --------------------
            // $('.el_count__box').addClass('is_disable')
            // $('.el_count__check').removeClass('is_disable')
            // ------------------------------------------------------------------
            $('.el_enter').addClass('is_disable')
            // トレーニングの種別
            switch (trainingData.type) {
                case 'flash':
                    break
                case 'fast':
                    $('#page_number').html('1 / ' + textArray.length)
                    $('.el_speed').append('<button id="saveSpeed" class="el_btn el_btn__green el_btn__rounded el_btn__size__main"><img src="' + contentPath + 'images/icon/icon_save_white.svg">記録を保存</button>')
                    break
                case 'reading':
                    if (trainingData.code == 'flip') {
                        $('#btn').html('<button id="saveSpeed" class="el_btn el_btn__red el_btn__rounded el_btn__size__main is_disable" disabled><img src="' + contentPath + 'images/icon/icon_complete_white.svg">読み終わり</button>')
                    } else {
                        $('#btn').html('<button id="saveSpeed" class="el_btn el_btn__green el_btn__rounded el_btn__size__main"><img src="' + contentPath + 'images/icon/icon_save_white.svg">記録を保存</button>')
                    }
                    $('#result').html($('#complete').html())
                    break
            }
            let value = $('input[name="switch-radio"]:checked').val()
            if (value == 0) {
                $('label[for="switch-2"]').addClass('is_disable')
            } else if (value == 1) {
                $('#result').html($('#complete').html())
                $('#checkStart').remove()
                $('label[for="switch-1"]').addClass('is_disable')
            }
        }))
        .catch(error => console.error('Error loading audio file:', error))
}

// ページ送り処理
function page() {
    pageNumber++
    if ((pageNumber + 1) <= textArray.length) {
        $('#page_number').html((pageNumber + 1) + ' / ' + textArray.length)
        question(pageNumber) // 出題文整形処理
        view() // 問題表示
        if ((pageNumber + 1) == textArray.length) {
            $('#side_btn').html('<button id="finish" class="el_btn el_btn__red el_btn__rounded el_btn__size__side_main"><img src="' + contentPath + 'images/icon/icon_btn_complete_red.svg">読み終わり</button>')
        }
    }
}

// 読み終わり処理
$(document).on("click", '#finish', function () {
    $('#result').html($('#complete').html())
    // タイプ：measureの場合
    if (trainingData.type == 'measure') {
        MicroModal.show('modal_finish')
        clearInterval(timerId)
        result()
        // ローカルストレージの削除
        localStorage.clear()
        finished = true;
    }
})

// 記録を保存処理
$(document).on("click", '#saveSpeed', function () {
    // 2024/04/19 追記
    // trainingData.typeがfastかreadingの場合は押下確認をfalseからtrueに変更
    if ($('#saveBtnClick').val() == 'false' && (trainingData.type == 'fast' || trainingData.type == 'reading')) {
        $('#saveBtnClick').val('true');
    }
    // 2024/04/19 追記ここまで
    // 一番早い読書スピードの記録を反映
    if (Number($('#result').html().replace(',', '')) < Number($('#complete').html().replace(',', ''))) $('#result').html($('#complete').html())
    $('#saveText').show()
    $('#saveText').fadeOut(2000)
    // めくりよみの場合
    if (trainingData.code == 'flip') {
        MicroModal.show('modal_finish')
        clearInterval(timerId)
        clearInterval(countId)
        clearInterval(audioId)
        result()
    }
})

// 次のトレーニングに進む処理
$(document).on("click", '#nextTraining', function () {
    let nextTraining = selectAllTraining.find(item => item.status === '')
    selectCurrentTraining.status = 'complete'
    nextTraining.status = 'active'
    // ローカルストレージへ保存
    let json = JSON.stringify(selectAllTraining, undefined, 1)
    localStorage.setItem('data', json) //選択トレーニング配列
    window.location.href = rootPath + "Training/" + nextTraining.type + "Mode" //次のトレーニングモード選択に遷移
})

// ホームに戻る処理
$(document).on("click", '#home', function () {
    // ローカルストレージの削除
    localStorage.clear()
    window.location.href = rootPath + "home" //ホームに遷移
})

// トレーニングコースに戻る処理
$(document).on("click", '#courseHome', function () {
    // ローカルストレージの削除
    localStorage.clear()
    window.location.href = rootPath + "training?lang=" + lang //トレーニングコースに戻る処理
})

// その他処理
//————————————————————————————————————————————————————————————————
// 文章分割処理
function splitSentence(size) {
    a = trainingData['question'][0].split(/\n/g)
    for (i = 0; i < a.length; ++i) {
        sentence = splitByChunk(a[i], size)
        ary = sliceByNumber(sentence, maxRow)
        $.each(ary, function (key, obj) {
            $.each(obj, function (key, item) {
                textArray.push(item)
            })
        })
    }
    textArray = sliceByNumber(textArray, maxRow)
    console.log(textArray)
}

// 文字数分割
function splitByChunk(str, size) {
    str = str.replace(/ +/g, '')
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
    for (let i = 0, x = 0; i < numChunks; ++i, x += size) {
        checkStr = str.substr(x, size + 1).slice(-1)
        if (checkStr == '。' || checkStr == '、' || checkStr == '」') {
            chunks[i] = str.substr(x, size + 1)
            x += 1
        } else {
            chunks[i] = str.substr(x, size)
        }
    }
    return chunks
}

// 配列数分割
function sliceByNumber(array, number) {
    let length = Math.ceil(array.length / number)
    return new Array(length)
        .fill()
        .map((_, i) => array.slice(i * number, (i + 1) * number))
}

// 画面幅変更処理
$(window).resize(function () {
    viewResize(trainingData.type, trainingData.code)
})

// 画面幅によるcss変更
function viewResize(type, code) {
    // width:1024より小さいとき一時停止
    if ($(window).width() < 1024) stop()
    switch (type) {
        case 'measure':
            $(window).height() < 790 ? $('.content_box').css('align-items', 'center') : $('.content_box').css('align-items', 'center')
            $(window).height() <= 820 ? $('#page_number').css('bottom', '1rem') : $('#page_number').css('bottom', '5rem')
            break;
        case 'fast':
            if ($(window).height() < 768) {
                $('.side.training').css('margin-top', '1rem')
                $('.el_count__side').css('margin-top', '1rem')
                $('#side_btn').css('margin-top', '-1rem')
                $('.ly_main__training.question').css('height', 'calc(100vh + var(--height-header_lg))')
            } else {
                $('.side.training').css('margin-top', '4rem')
                $('.el_count__side').css('margin-top', '2rem')
                $('#side_btn').css('margin-top', 'auto')
                $('.ly_main__training.question').css('height', '100vh')
            }
            //$(window).height() < 768 ? $('.side.training').css('margin-top', '2rem') : $('.side.training').css('margin-top', '4rem')
            $(window).height() < 790 ? $('.content_box').css('align-items', 'center') : $('.content_box').css('align-items', 'center')
            $(window).height() <= 820 ? $('#page_number').css('bottom', '1rem') : $('#page_number').css('bottom', '5rem')
            break;
        case 'reading':
            if ($(window).height() < 768) {
                $('.ly_main__training.question').css('height', 'calc(100vh + var(--height-header_lg))')
                $('#btn').css('margin', '1rem 0')
            } else {
                $('.ly_main__training.question').css('height', '100vh')
                $('#btn').css('margin', '3.2rem')
            }
            $(window).height() <= 768 ? $('#btn').addClass('resize') : $('#btn').removeClass('resize')
            break;

        default:
            break;
    }
}

// エラー処理
function error() {
    // トレーニングの場合
    if (!path.includes('Measure')) {
        // セッションがない場合、トレーニングタイプとURLパスが違う場合
        if (!selectAllTraining || selectAllTraining == null || !path.includes('Training/' + selectCurrentTraining.type)) errorTransition()
        // 読書スピード測定の場合
    } else {
        // セッションがない場合
        if (!lang) {
            errorTransition()
        }
    }
}
