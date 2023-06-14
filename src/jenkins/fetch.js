import axios from "axios";
import { BASE_URL, USER_NAME ,PASSWORD} from "./configs.js";

axios.defaults.baseURL = BASE_URL

axios.interceptors.response.use(function (response) {
  const { data } = response;
  if(typeof data === "object") {
    const pattern = /http:\/\/192\.168\.56\.101:8080\/jenkins\//g;
    response.data = JSON.parse(JSON.stringify(data).replace(pattern,BASE_URL))
  }
  // 对响应数据做点什么
  return response;
}, function (error) {
  // 对响应错误做点什么
  return Promise.reject(error);
});

export const get = (apiPath,params)=> axios.get(apiPath,params)

export const post = (apiPath)=> axios.post(apiPath,null,{
  auth: {
    username:USER_NAME,
    password:PASSWORD
  }
})