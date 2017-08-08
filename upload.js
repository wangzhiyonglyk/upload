
/*
 #######  断点续传  ######
 author：wangzhiyong
 createTime: 2016-10-10
 desc:将上传/断点续传封装成插件
 QQ: 409087796
 */
/*
 /**********
 * 回传到后台参数
 * startSize int，分片开始位置，如果不是断点续传，则为null
 * endSize int ,分片结束位置，如果不是断点续传，则为null
 * fileName 字符型 文件名称
 * file  文件类型，文件/分片
 ********
 * 后台回传到前端的json对象必须有success属性
 ************/
//*示例，
// $upload(
//     {
//         container:"good",//容器id,必填
//         url:"http://localhost:7499/Admin/Upload",//上传地址,必填
//         paragraphAble:true,//是滞断点续传
//         width:180,//宽度，默认为180
//         theme:"red"//主题，red,blue,orange,green,black。默认为白色
//     }
// );

var $upload = (function () {

    //需要用户定义的参数
    var container = "";//上传文件容器
    var paragraphAble = false;//是否分片
    var uploadUrl = "";//上传地址
    var paragraph = 10240;  //每次分片传输文件的大小 10KB
    var auto = false;//是否自动上传

    //上传时所需要的变量
    var fileName = "";//上传的文件名称
    var blob = null;//  分片数据的载体Blob对象
    var file = null; //传输的文件
    var startSize, endSize = 0; //分片的字节始，终位置
    var uploadState = 0;  //上传状态 0: 无上传， 1： 上传中
    var maxFailNum = 10;//最大失误次数
    var failNum = 0;//当前失误次数


    //初始化
    return function init(settings) {
        /// <summary>
        /// 初始化
        /// </summary>
        /// <param name="settings" type="object">上传参数</param>
        if (!settings) {
            //alert("上传参数对象不能空，请设置");
            return;
        }
        if (typeof settings !== "object") {
            alert("参数必须是对象");
            return;
        }
        if (!settings.container) {
            alert("container参数不能为空");
            return;
        }
        if (typeof settings.container !== "string") {
            alert("container参数必须为字符型");
            return;
        }
        if (!settings.url) {
            alert("url参数不能为空");
            return;
        }
        else if (typeof settings.url !== "string") {
            alert("url参数必须为字符类型");
            return;

        }
        else {
            uploadUrl = settings.url;//设置上传地址
        }
        if (settings.paragraphAble != null && settings.paragraphAble != undefined && typeof settings.paragraphAble !== "boolean") {
            alert("paragraphAble参数只能是bool类型");
            return;
        }
        if (settings.paragraphAble == true) {
            paragraphAble = settings.paragraphAble;//是否允许断点续传
        }
        else {
            paragraphAble = false;
        }
        auto = settings.auto;//是否自动上传


        if (!settings.width) {
            settings.width = "180px";
        }
        else if (typeof settings.width === "number") {
            settings.width += "px";
        }
        container = settings.container;
        $("#" + container).html(' <div class="uploader ' + settings.theme + '" >'
            + '<input type="text" style="width:' + settings.width + '" class="filename" readonly="readonly" value="">'
            + '<input type="button" class="button" value="选择...">'
            + '<input type="button" class="sumbit" value="上传">'
            + '<input type="file" >'
            + '</div>');
        $("#" + container).find(":file").on("change", function () {
            fileSelected(this);
        })
         $("#" + container).find(".sumbit").on("click", function () {
                beginUpload();
        });

        checkRight();//检测是否支持
    }

    //检测是否支持
    function checkRight() {
        /// <summary>
        /// 检测是否支持
        /// </summary>
        if (typeof FormData == 'undefined') {
            $("#" + container).find(".filename").val("浏览器不支持FormData");//显示文件名
            $("#" + container).find(":file").attr("disabled", true);//不可以再选择
            $("#" + container).find(".button").attr("disabled", true);//不可以再选择，不可以再上传
            return false;
        }
        return true;
    }

    //选择文件之后触发事件
    function fileSelected(event) {
        /// <summary>
        /// 选择文件之后触发事件
        /// </summary>
        file = event.files[0];//保存文件信息
        if (file && auto) {//自动上传
            beginUpload();

        }
        else {
             $('#' + container).find(".sumbit").show();//显示上传文件
               fileName = file.name;////上传的文件名称
            $('#' + container).find(".filename").val(fileName);
        }
    }

    //开始上传
    function beginUpload() {
        if (file) {
            //文件类型
            var icontype = file.name.substring(file.name.lastIndexOf("."));
            if (icontype == null || icontype == "" || icontype == ".exe" || icontype == ".js" || icontype == ".bat" || icontype == ".cmd") {//不可知的文件名，或者为是可执行的
                errorHandler(null, 901, "危险文件，不允许上传,或者您将之压缩");
                return;
            }
            $('#' + container).find(":file").attr("disabled", true);//不可以再选择
            $('#' + container).find(".button").attr("disabled", true);//不可以再选择
              $('#' + container).find(".sumbit").attr("disabled", true);//不可以再选择
            fileName = file.name;////上传的文件名称
            $('#' + container).find(".filename").val(fileName);
            uploadState = 1;//将上传状态变为正在上传中
            if (paragraphAble) {
                endSize = getLastestUploadEndSize(fileName);// 从localStorage获取最后一次上传的字节数位置
                var fileSize = 0;//文件大小
                if (file.size > 1024 * 1024)
                    fileSize = (Math.round(file.size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
                else
                    fileSize = (Math.round(file.size * 100 / 1024) / 100).toString() + 'KB';
                sliceParagraph();//开始切片，准备上传
            }
            else {

                fileUpload(file);//直接上传
            }
        }

    }

    //从localStorage检查最后一次上传的字节数标记
    function getLastestUploadEndSize(newfilename) {
        /// <summary>
        /// 从localStorage检查最后一次上传的字节数标记
        /// </summary>
        /// <param name="uploadFile" type="object">处理过的文件名</param>
        var lastestLen = localStorage.getItem(newfilename);
        if (lastestLen) {
            return parseInt(lastestLen);
        } else {
            return 0;

        }
    }
    //将上传的文件分片
    function sliceParagraph() {
        /// <summary>
        /// 将上传的文件分片
        /// </summary>
        //读取成功以后
        try {
            if (endSize < file.size) {
                //没有上传完
                //处理文件发送（字节）
                startSize = endSize;//设置起始位置

                if (paragraph > (file.size - endSize)) {
                    //最后一次不足分片了
                    endSize = file.size;
                } else {
                    //继续分片
                    endSize += paragraph;
                }
                //文件切割
                if (file.webkitSlice) {
                    //webkit浏览器
                    blob = file.webkitSlice(startSize, endSize);
                } else {//其他浏览器
                    blob = file.slice(startSize, endSize);
                }
                fileUpload(blob);

            }
        }
        catch (e) {
            errorHandler(null, 902, e.message)
            reLoad();//重置
        }
    }
    //异步发送二进制数据数据
    function fileUpload(fileBlob) {
        /// <summary>
        /// 异步发送二进制数据数据
        /// </summary>
        /// <param name="fileBlob" type="byte[]">数据片</param>

        //先改变上传进度，防止用户刷新，但是后台已经上传了这一片
        if (paragraphAble) {
            uploadProgress(endSize);
        }

        //设置数据
        var formData = new FormData();
        formData.append("startSize", paragraphAble ? startSize : null);
        formData.append("endSize", paragraphAble ? endSize : null);
        formData.append("fileName", fileName);
        formData.append("file", fileBlob);
        try {

            var xhrRequest = new XMLHttpRequest();
            xhrRequest.upload.addEventListener("progress", xhrProgress, false);//上传进度
            xhrRequest.addEventListener("load", xhrLoad, false);
            xhrRequest.addEventListener("error", xhrError, false);
            xhrRequest.open("POST", uploadUrl, true);
            xhrRequest.responseType = "json";
            xhrRequest.send(formData);
        } catch (e) {
            errorHandler(null, 903, e.message);
            reLoad();//重置
        }
    }

    //断点续传时上传进度
    function uploadProgress(uploadLen) {
        /// <summary>
        /// 上传进度
        /// </summary>
        /// <param name="uploadLen" type="int">已经发送的文件长度</param>
        var percentComplete = (uploadLen * 100 / file.size).toFixed(1);

        $('#' + container).find(".button").val("上传" + percentComplete + "%");

        //保存到LocalStorage一边下次传输，可以记忆起这个断点
        localStorage.setItem(fileName, uploadLen);


    }
    /*
    xhr 事件
     */

    //上传进度事件
    function xhrProgress(event) {
        if (event.lengthComputable) {
            var percentComplete = Math.round(event.loaded * 100 / event.total);
            if (!paragraphAble) {
                $('#' + container).find(".button").val("上传" + percentComplete + "%");
            }
        }
    }

    //请求成功
    function xhrLoad(event) {
        var xhr = (event.target);
        if (xhr.readyState == 4 && ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304)) {
            //json格式请求
            var result = xhr.response;
            /////////////////////////////
            /*  先判断后台所传的数据格式  */
            if (paragraphAble && result.success == undefined || result.success == null) {
                errorHandler(xhr, 802, "断点续传时服务器回传的json数据中必须有success属性,已清空上传记录,请注意！！！");
                return;
            }
            else if (paragraphAble == false) {//非断点续传，不论是否有这个字段，都标记成功
                $('#' + container).find(".button").val("上传成功");
                setTimeout(function () {
                    reLoad();//一秒后重置
                },
                    1000
                )
            }
            /////////////////////////////////////////////
            if (result.success && uploadState == 1) {
                //上传成功
                if (paragraphAble) {//分片
                    if (endSize == file.size) {
                        //当前文件全部上传
                        //移除本地存储记录,
                        $('#' + container).find(".button").val("上传成功");
                        setTimeout(function () {
                            reLoad();
                        },
                            1000
                        )
                    } else {
                        //上传下一片
                        sliceParagraph();
                    }
                }
                else {
                    $('#' + container).find(".button").val("上传成功");
                    setTimeout(function () {
                        reLoad();
                    },
                        1000
                    )

                }

            }
            else {
                //上传失败
                if (paragraphAble) {
                    //如果后台处理错误则退回一片
                    endSize = endSize - paragraph;//退回一片
                    if (failNum < maxFailNum) {//
                        failNum++;
                        sliceParagraph();//重新上传
                    }
                    else {//错误次数过多
                        reLoad();//重置
                        if (result.message) {//有自定义错误
                            errorHandler(xhr, 801, result.message);
                        }
                        else {//没有自定义错误
                            errorHandler(xhr, 500, "");
                        }


                    }
                }
                else {
                    reLoad();//重置
                    if (result.message) {//有自定义错误
                        errorHandler(xhr, 801, result.message);
                    }
                    else {//没有自定义错误
                        errorHandler(xhr, 500, "");
                    }


                }

            }
        }
        else {//是4xx错误时，并不属于Network error,不会触发error事件
            errorHandler(xhr, xhr.status, xhr.statusText);
        }


    }

    //请求失败
    function xhrError(event) {
        var xhr = (event.target);
        errorHandler(xhr, xhr.status, xhr.statusText);
    }
    //通用错误处理函数
    function errorHandler(xhr, errCode, message) {

        reLoad();//重置
        if (errCode == 404) {
            alert("请求地址无效");
        }
        else if (errCode == 500) {
            alert("服务器内部错误");
        }
        else if (errCode == 0) {
            if (message == "") {
                alert("后台处理错误");
            }
            else {
                alert(message);
            }
        }
        else {//其他错误
            alert(message);
        }


    }

    //重置
    function reLoad() {
        /// <summary>
        /// 重置
        /// </summary>
        localStorage.removeItem(fileName);
        failNum = 0;//清除错误次数
        uploadState = 0;//上传状态清空
        startSize = endSize = 0;//最后一次上传字节位置清空

        $("#" + container).find(":file").attr("disabled", false);//可以再选择
        $('#' + container).find(".button").val("选择...");      
        $("#" + container).find(".button").attr("disabled", false);//可以再选择
         $("#" + container).find(".sumbit").attr("disabled", false);//可以再选择
          $("#" + container).find(".sumbit").hide();//可以再选择
        $("#" + container).find(".filename").val("");//清空文件名
        //移除选中的文件
        var fileToUploadobj = $("#" + container).find(":file");
        fileToUploadobj.after(fileToUploadobj.clone().val(""));
        fileToUploadobj.remove();

        $("#" + container).find(":file").on("change", function () {
            fileSelected(this);
        })
    }
})();
