export default class UTime {
    private static _timeList;
    private static _objTimeMap;
    private static _hasActiveTimers;
    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    static addTime(duration: number, loopcall: () => void, loopcount?: number, endcall?: () => void): number;
    /**
     * 添加一个一次性计时器
     */
    static addTimeOnce(duration: number, callback: () => void): number;
    /**
     * 移除指定ID的计时器
     */
    static removeTime(id: number): void;
    /**
     * 获取对象的唯一标识
     */
    private static getObjectId;
    /**
     * 为对象添加计时器
     */
    static addObjTime(obj: any, duration: number, callback: () => void, loopcount?: number, endcall?: () => void): number;
    /**
     * 为对象添加一次性计时器
     */
    static addObjTimeOnce(obj: any, duration: number, callback: () => void): number;
    /**
     * 移除对象的所有计时器
     */
    static removeObjTime(obj: any): void;
    /**
     * 移除对象的指定计时器
     */
    static removeObjTimeById(obj: any, id: number): number;
    /**
     * 清除所有计时器
     */
    static clear(): void;
    /**
     * 更新所有计时器
     */
    static update(): void;
}
