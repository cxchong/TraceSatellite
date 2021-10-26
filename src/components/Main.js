import React, { Component } from "react";
import { Row, Col } from "antd";
import axios from "axios";
import { NEARBY_SATELLITE, SAT_API_KEY, STARLINK_CATEGORY } from "../constants";
import SatSetting from "./SatSetting";
import SatelliteList from "./SatelliteList";
import WorldMap from "./WorldMap";

class Main extends Component {
  // class component的初始化，在constructor里
  constructor() {
    super();
    this.state = {
      satInfo: null,
      satList: null,
      // 用于存用户输入
      setting: null,
      isLoadingList: false,
    };
  }
  render() {
    const { isLoadingList, satInfo, satList, setting } = this.state;
    return (
      <Row className="main">
        <Col span={8} className="left-side">
          <SatSetting onShow={this.showNearbySatellite} />
          <SatelliteList
            isLoad={isLoadingList}
            satInfo={satInfo}
            onShowMap={this.showMap}
          />
        </Col>
        <Col span={16} className="right-side">
          <WorldMap satData={satList} observerData={setting} />
        </Col>
      </Row>
    );
  }
  showMap = (selected) => {
    this.setState((preState) => ({
      ...preState,
      satList: [...selected],
    }));
  };

  showNearbySatellite = (setting) => {
    this.setState({
      isLoadingList: true,
      setting: setting,
    });
    this.fetchSatellite(setting);
  };

  fetchSatellite = (setting) => {
    const { latitude, longitude, elevation, altitude } = setting;
    const url = `/api/${NEARBY_SATELLITE}/${latitude}/${longitude}/${elevation}/${altitude}/${STARLINK_CATEGORY}/&apiKey=${SAT_API_KEY}`;

    // 最开始先转圈圈
    this.setState({
      isLoadingList: true,
    });

    axios // http get；参数都已经在URL里;到这一步为止1.发送一个request，2.返回一个JS class(ES6之后才有)promice的object
      .get(url)
      .then((response) => { // then表示网络层面有response回来；
        console.log(response.data);
        this.setState({
          satInfo: response.data,
          isLoadingList: false,
        });
      })
      .catch((error) => { // 网络问题或者404都会进入catch
        console.log("err in fetch satellite -> ", error);
      });
      // 可以写个finally停止转圈
      // 如果这之后有代码，代码会在axios之后执行（JS单线程），但axios成功与否不一定
  };
}
export default Main;




