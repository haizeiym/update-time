interface TimerItem {
    id: number;
    duration: number;
    curtime: number;
    loopcount: number;
    loopcountcur: number;
    loopcall: () => void;
    endcall?: () => void;
    next?: TimerItem;
}

let timeId: number = 0;

export default class UTime {
    private static _timeList: TimerItem | undefined = undefined;
    private static _objTimeMap: Map<string, Set<number>> = new Map();
    private static _hasActiveTimers: boolean = false;

    /**
     * 添加一个计时器
     * @param duration 间隔时间(毫秒)
     * @param loopcall 循环回调
     * @param loopcount 循环次数
     * @param endcall 结束回调
     * @returns 计时器ID
     */
    public static addTime(duration: number, loopcall: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
        const id = ++timeId;
        const newTimer: TimerItem = {
            id,
            duration,
            curtime: Date.now(),
            loopcall,
            loopcount,
            loopcountcur: 0,
            endcall,
            next: this._timeList || undefined
        };
        this._timeList = newTimer;
        this._hasActiveTimers = true;
        return id;
    }

    /**
     * 添加一个一次性计时器
     */
    public static addTimeOnce(duration: number, callback: () => void): number {
        return this.addTime(duration, callback, 1);
    }

    /**
     * 移除指定ID的计时器
     */
    public static removeTime(id: number) {
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (current.id === id) {
                if (prev) {
                    prev.next = current.next;
                } else {
                    this._timeList = current.next;
                }
                this._hasActiveTimers = this._timeList !== undefined;
                return;
            }
            prev = current;
            current = current.next;
        }
    }

    /**
     * 获取对象的唯一标识
     */
    private static getObjectId(obj: any): string {
        // 支持 Cocos Creator 2.4 和 3.x
        return obj.uuid || obj._id || '';
    }

    /**
     * 为对象添加计时器
     */
    public static addObjTime(obj: any, duration: number, callback: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
        const key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return -1;
        }

        // 创建或获取对象的计时器集合
        if (!this._objTimeMap.has(key)) {
            this._objTimeMap.set(key, new Set());
        }

        // 添加计时器
        const id = this.addTime(duration, callback, loopcount, () => {
            // 计时器结束时从集合中移除
            this._objTimeMap.get(key)?.delete(id);
            endcall?.();
        });

        // 记录计时器ID
        this._objTimeMap.get(key)?.add(id);

        return id;
    }

    /**
     * 为对象添加一次性计时器
     */
    public static addObjTimeOnce(obj: any, duration: number, callback: () => void): number {
        return this.addObjTime(obj, duration, callback, 1);
    }

    /**
     * 移除对象的所有计时器
     */
    public static removeObjTime(obj: any) {
        const key = this.getObjectId(obj);
        if (!key) {
            console.error("Object has no uuid or _id");
            return;
        }

        const timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            // 移除所有计时器
            timerSet.forEach((id) => this.removeTime(id));
            this._objTimeMap.delete(key);
        }
    }

    /**
     * 移除对象的指定计时器
     */
    public static removeObjTimeById(obj: any, id: number): number {
        const key = this.getObjectId(obj);
        if (!key || id === -1) {
            console.error("Object has no uuid or _id");
            return -1;
        }

        const timerSet = this._objTimeMap.get(key);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(key);
            }
            this.removeTime(id);
        }
        return -1;
    }

    /**
     * 清除所有计时器
     */
    public static clear() {
        this._timeList = undefined;
        this._objTimeMap.clear();
        this._hasActiveTimers = false;
        timeId = 0;
    }

    /**
     * 更新所有计时器
     */
    public static update() {
        if (!this._hasActiveTimers) return;

        const now = Date.now();
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (now - current.curtime >= current.duration) {
                current.loopcall();
                current.loopcountcur++;

                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = current.next;
                } else {
                    current.endcall?.();
                    if (prev) {
                        prev.next = current.next;
                    } else {
                        this._timeList = current.next;
                    }
                    current = current.next;
                }
            } else {
                prev = current;
                current = current.next;
            }
        }

        this._hasActiveTimers = this._timeList !== undefined;
    }
}
