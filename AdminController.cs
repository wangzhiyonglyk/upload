using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using DuoDuo.Meeting.Models;
using DuoDuo.Common;
using System.Reflection;
using DuoDuo.DBUtility;
using System.IO;
namespace DuoDuo.Meeting.Controllers
{

    /// <summary>
    /// 管理员
    /// </summary>
    public class AdminController : Controller
    {
        public ActionResult Upload(int? startSize, int? endSize,string fileName, HttpPostedFileBase file)
        {

            if (fileName != null && file != null)
            {//参数传入正确,因为xhr上传文件时有预请求，所以一定判断
                if (!DuoDuo.Common.FileOP.IsExistDirectory(Server.MapPath("~/Upload")))
                {//如果文件夹不存在，创建文件夹
                    DuoDuo.Common.FileOP.CreateDirectory(Server.MapPath("~/Upload"));
                }
                if (startSize!=null&&endSize!=null)
                {//断点续传
                    try
                    {
                        if(startSize==0)
                        {//第一次上传时，判断是文件是否存在
                            if (FileOP.IsExistFile(Server.MapPath("~/Upload/" + fileName)))
                            {//如果文件存在，注意直接返回
                                jsR.success = false;
                                jsR.message = SYSTEMCONSTANT.EXIST;
                                return Content();
                            }
                            else
                            {//创建文件
                                FileOP.CreateFile(Server.MapPath("~/Upload/" + fileName));
                            }

                        }        

                        ////文件追加流，权限设置为可写
                        System.IO.FileStream stream = new System.IO.FileStream(Server.MapPath("~/Upload/" + fileName), FileMode.Append, System.IO.FileAccess.Write, FileShare.ReadWrite);
                        //将文件流转为byte
                        byte[] bytes = new byte[file.InputStream.Length];
                        file.InputStream.Read(bytes, 0, bytes.Length);
                        // 设置当前流的位置为流的开始
                        file.InputStream.Seek(0, SeekOrigin.Begin);
                        //写入到文件
                        stream.Write(bytes, 0, bytes.Length);
                        //关闭
                        stream.Flush();
                        stream.Close();
                        stream.Dispose();
                        jsR.success = true;//上传成功
                       
                    }
                    catch (SystemException ex)
                    {
                        jsR.success = false;
                        jsR.message = ex.Message;
                    }

                }
                else
                {//非断点续传
                    if (FileOP.IsExistFile(Server.MapPath("~/Upload/" + fileName)))
                    {//如果文件存在
                        jsR.success = false;
                        jsR.message = SYSTEMCONSTANT.EXIST;


                    }
                    else
                    {//文件不存在
                        try
                        {//保存文件
                            file.SaveAs(Server.MapPath("~/Upload/" + fileName));
                            jsR.success = true;

                        }
                        catch (SystemException ex)
                        {//文件保存出错
                            jsR.errCode = "801";
                            jsR.message = ex.Message;
                        }
                    }

                }
               
            }
            return Content();
        }
    }
}