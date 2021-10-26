/*import React, {Component} from 'react';
import { feature } from 'topojson-client';
import axios from 'axios';
import { geoKavrayskiy7 } from 'd3-geo-projection';
import { geoGraticule, geoPath } from 'd3-geo';
import { select as d3Select } from 'd3-selection';

import { WORLD_MAP_URL } from "../constants";

const width = 960;
const height = 600;
class WorldMap extends Component {
    constructor(){
        super();
        this.state = {
            map: null
        }
        // 一个和render解除耦合的变量
        // 在前端画图所用的element canvas，和React毫无关系，一般用ref操作
        this.refMap = React.createRef();
    }

    // class component用didMount拉数据；func用useEffect
    componentDidMount() {
        axios.get(WORLD_MAP_URL)
            .then(res => {
                const { data } = res;
                const land = feature(data, data.objects.countries).features;
                // land是parse好的data
                this.generateMap(land);
            })
            .catch(e => console.log('err in fecth world map data ', e))
    }

    generateMap(land){
        const projection = geoKavrayskiy7()
            .scale(170)
            .translate([width / 2, height / 2])
            .precision(.1);

        const graticule = geoGraticule();

        // 用d3设置map
        const canvas = d3Select(this.refMap.current)
            .attr("width", width)
            .attr("height", height);

        let context = canvas.node().getContext("2d");

        // path是个function
        let path = geoPath()
            .projection(projection)
            .context(context);

        // 核心处理代码
        land.forEach(ele => {
            context.fillStyle = '#B3DDEF';
            context.strokeStyle = '#000';
            context.globalAlpha = 0.7;
            context.beginPath();
            path(ele);
            // 这两句是在画
            context.fill();
            context.stroke();

            context.strokeStyle = 'rgba(220, 220, 220, 0.1)';
            context.beginPath();
            path(graticule());
            context.lineWidth = 0.1;
            context.stroke();

            context.beginPath();
            context.lineWidth = 0.5;
            path(graticule.outline());
            context.stroke();
        })
    }

    render() {
        return (
            <div className="map-box">
                <canvas className="map" ref={this.refMap} />
            </div>
        );
    }
}

export default WorldMap; */
import React, { Component } from "react";
import axios from "axios";
import { Spin } from "antd";
import { feature } from "topojson-client";
import { geoKavrayskiy7 } from "d3-geo-projection";
import { geoGraticule, geoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { timeFormat as d3TimeFormat } from "d3-time-format";

import {
  WORLD_MAP_URL,
  SATELLITE_POSITION_URL,
  SAT_API_KEY,
} from "../constants";

const width = 960;
const height = 600;

class WorldMap extends Component {
    constructor() {
      super();
      this.state = {
        isLoading: false,
        isDrawing: false,
      };
      this.map = null;
      this.color = d3Scale.scaleOrdinal(schemeCategory10);
      // 用来创建mutable object，这个object包含current 属性，可以用来保存和引用一些值，并且修改这个属性不会触发组件更新
      this.refMap = React.createRef();
      this.refTrack = React.createRef();
    }
  
    componentDidMount() {
      axios
        .get(WORLD_MAP_URL)
        .then((res) => {
          const { data } = res;
          // land是parse好的data
          const land = feature(data, data.objects.countries).features;
          this.generateMap(land);
        })
        .catch((e) => {
          console.log("err in fetch map data ", e.message);
        });
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.satData !== this.props.satData) {
          const { latitude, longitude, elevation, duration } =
            this.props.observerData;
          const endTime = duration * 60;
    
          this.setState({
            isLoading: true,
          });
    
          // map() 方法返回一个新数组，不会改变原始数组。
          // 同时新数组中的元素为原始数组元素调用函数处理后的值，并按照原始数组元素顺序依次处理元素。
          // 也就是说，这里是在做一系列API call
          const urls = this.props.satData.map((sat) => {
            const { satid } = sat;
            const url = `/api/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;
    
            return axios.get(url);
          });
    
          Promise.all(urls) // urls是an iterable of promises
            .then((res) => { // res[0], res[1]...
              const arr = res.map((sat) => sat.data);
              this.setState({
                isLoading: false,
                isDrawing: true,
              });
              
              if (!prevState.isDrawing) {
                this.track(arr);
              } else {
                const oHint = document.getElementsByClassName("hint")[0];
                oHint.innerHTML =
                  "Please wait for these satellite animation to finish before selection new ones!";
              }
            })
            .catch((e) => {
              console.log("err in fetch satellite position -> ", e.message);
            });
        }
    }
    track = (data) => {
        if (!data[0].hasOwnProperty("positions")) {
          throw new Error("no position data");
        }
        // data[0]是某个卫星；positions是其中15分钟内所有这个卫星的位置
        const len = data[0].positions.length;
        const { context2 } = this.map;
    
        let now = new Date();
    
        let i = 0;
        
        // setInterval隔一秒执行一次（第二个参数1000）
        let timer = setInterval(() => {
          let ct = new Date();
    
          let timePassed = i === 0 ? 0 : ct - now;
          let time = new Date(now.getTime() + 60 * timePassed);
          
          // 全部清除
          context2.clearRect(0, 0, width, height);
    
          context2.font = "bold 14px sans-serif";
          context2.fillStyle = "#333";
          context2.textAlign = "center";
          context2.fillText(d3TimeFormat(time), width / 2, 10);
    
          // setInterval停止的条件
          if (i >= len) {
            clearInterval(timer);
            this.setState({ isDrawing: false });
            const oHint = document.getElementsByClassName("hint")[0];
            oHint.innerHTML = "";
            return;
          }
    
          data.forEach((sat) => {
            const { info, positions } = sat;
            this.drawSat(info, positions[i]);
          });

          // 只要每分钟停止的状态
          i += 60;
        }, 1000);
    };

    drawSat = (sat, pos) => {
        const { satlongitude, satlatitude } = pos;
    
        if (!satlongitude || !satlatitude) return;
    
        const { satname } = sat;
        const nameWithNumber = satname.match(/\d+/g).join("");
    
        const { projection, context2 } = this.map;
        const xy = projection([satlongitude, satlatitude]);
    
        context2.fillStyle = this.color(nameWithNumber);
        // Canvas 2D API 通过清空子路径列表开始一个新路径的方法。 当你想创建一个新的路径时，调用此方法
        context2.beginPath();
        // 是 Canvas 2D API 绘制圆弧路径的方法
        context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
        context2.fill();
    
        context2.font = "bold 11px sans-serif";
        context2.textAlign = "center";
        context2.fillText(nameWithNumber, xy[0], xy[1] + 14);
    };
    
    render() {
        const { isLoading } = this.state;
        return (
          <div className="map-box">
            {isLoading ? (
              <div className="spinner">
                <Spin tip="Loading..." size="large" />
              </div>
            ) : null}
            {/* Refs 是使用 React.createRef() 创建的，并通过 ref 属性附加到 React 元素 */}
            {/* ref通过render放入一个元素中 */ }
            <canvas className="map" ref={this.refMap} />
            <canvas className="track" ref={this.refTrack} />
            <div className="hint" />
          </div>
        );
    }
    generateMap = (land) => {
        const projection = geoKavrayskiy7()
          .scale(170)
          .translate([width / 2, height / 2])
          .precision(0.1);
    
        const graticule = geoGraticule();
    
        // 通过refMap.current来访问canvas的DOM实例；
        const canvas = d3Select(this.refMap.current)
          .attr("width", width)
          .attr("height", height);
    
        const canvas2 = d3Select(this.refTrack.current)
          .attr("width", width)
          .attr("height", height);
    
        // <canvas> 元素有一个叫做 getContext() 的方法，这个方法是用来获得渲染上下文和它的绘画功能
        // getContext()只有一个参数，上下文的格式(这里是2d)
        const context = canvas.node().getContext("2d");
        const context2 = canvas2.node().getContext("2d");
    
        let path = geoPath().projection(projection).context(context);
    
        land.forEach((ele) => {
          context.fillStyle = "#B3DDEF";
          context.strokeStyle = "#000";
          context.globalAlpha = 0.7;
          context.beginPath();
          path(ele);
          context.fill();
          context.stroke();
    
          context.strokeStyle = "rgba(220, 220, 220, 0.1)";
          context.beginPath();
          path(graticule());
          context.lineWidth = 0.1;
          context.stroke();
    
          context.beginPath();
          context.lineWidth = 0.5;
          path(graticule.outline());
          context.stroke();
        });
    
        this.map = {
          projection: projection,
          graticule: graticule,
          context: context,
          context2: context2,
        };
    };
}
    
    export default WorldMap;
    


    
    
  

