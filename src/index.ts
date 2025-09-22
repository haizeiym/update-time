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
    private static _objTimeMap: Map<object, Set<number>> = new Map();
    private static _hasActiveTimers: boolean = false;
    private static _isUpdating: boolean = false;
    private static _pendingTimers: TimerItem[] = [];

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
        const now = Date.now();
        
        const newTimer: TimerItem = {
            id,
            duration,
            curtime: now,
            loopcall,
            loopcount,
            loopcountcur: 0,
            endcall,
            next: undefined
        };

        // 如果正在更新中，将计时器加入待处理队列
        if (this._isUpdating) {
            this._pendingTimers.push(newTimer);
        } else {
            // 直接添加到链表头部
            newTimer.next = this._timeList || undefined;
            this._timeList = newTimer;
        }
        
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
                
                // 清理回调函数引用，帮助垃圾回收
                current.loopcall = () => {};
                current.endcall = undefined;
                current.next = undefined;
                
                // 清理其他属性，确保完全失效
                current.id = -1;
                current.duration = 0;
                current.curtime = 0;
                current.loopcount = 0;
                current.loopcountcur = 0;
                
                this._hasActiveTimers = this._timeList !== undefined;
                return;
            }
            prev = current;
            current = current.next;
        }
    }

    /**
     * 为对象添加计时器
     */
    public static addObjTime(obj: any, duration: number, callback: () => void, loopcount: number = Number.MAX_VALUE, endcall?: () => void): number {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTime: Object parameter is null or undefined");
            } else {
                console.error(`addObjTime: Object parameter must be an object, got ${typeof obj}`);
            }
            return -1;
        }

        if (!this._objTimeMap.has(obj)) {
            this._objTimeMap.set(obj, new Set());
        }

        const id = this.addTime(duration, callback, loopcount, () => {
            const timerSet = this._objTimeMap.get(obj);
            if (timerSet) {
                timerSet.delete(id);
                if (timerSet.size === 0) {
                    this._objTimeMap.delete(obj);
                }
            }
            endcall?.();
        });

        this._objTimeMap.get(obj)?.add(id);

        return id;
    }

    /**
     * 为对象添加一次性计时器
     */
    public static addObjTimeOnce(obj: any, duration: number, callback: () => void): number {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("addObjTimeOnce: Object parameter is null or undefined");
            } else {
                console.error(`addObjTimeOnce: Object parameter must be an object, got ${typeof obj}`);
            }
            return -1;
        }
        return this.addObjTime(obj, duration, callback, 1);
    }

    /**
     * 移除对象的所有计时器
     */
    public static removeObjTime(obj: any) {
        if (!obj || typeof obj !== 'object') {
            if (!obj) {
                console.error("removeObjTime: Object parameter is null or undefined");
            } else {
                console.error(`removeObjTime: Object parameter must be an object, got ${typeof obj}`);
            }
            return;
        }

        const timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.forEach((id) => this.removeTime(id));
            this._objTimeMap.delete(obj);
        }
    }

    /**
     * 移除对象的指定计时器
     */
    public static removeObjTimeById(obj: any, id: number): number {
        if (!obj || typeof obj !== 'object' || id === -1) {
            if (!obj) {
                console.error("removeObjTimeById: Object parameter is null or undefined");
            } else if (typeof obj !== 'object') {
                console.error(`removeObjTimeById: Object parameter must be an object, got ${typeof obj}`);
            } else if (id === -1) {
                console.error("removeObjTimeById: Timer ID cannot be -1 (invalid ID)");
            }
            return -1;
        }

        const timerSet = this._objTimeMap.get(obj);
        if (timerSet) {
            timerSet.delete(id);
            if (timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
            this.removeTime(id);
        }
        return -1;
    }

    /**
     * 清除所有计时器
     */
    public static clear() {
        // 清理所有计时器的回调函数引用
        let current: TimerItem | undefined = this._timeList;
        while (current) {
            current.loopcall = () => {};
            current.endcall = undefined;
            const next = current.next;
            current.next = undefined;
            
            // 清理其他属性，确保完全失效
            current.id = -1;
            current.duration = 0;
            current.curtime = 0;
            current.loopcount = 0;
            current.loopcountcur = 0;
            
            current = next;
        }
        
        // 清理待处理队列中的计时器
        this._pendingTimers.forEach(timer => {
            timer.loopcall = () => {};
            timer.endcall = undefined;
            timer.next = undefined;
            
            // 清理其他属性，确保完全失效
            timer.id = -1;
            timer.duration = 0;
            timer.curtime = 0;
            timer.loopcount = 0;
            timer.loopcountcur = 0;
        });
        
        this._timeList = undefined;
        this._objTimeMap.clear();
        this._hasActiveTimers = false;
        this._isUpdating = false;
        this._pendingTimers.length = 0;
        timeId = 0;
    }

    /**
     * 清理无效的对象引用（可选的手动清理）
     */
    public static cleanup() {
        // 清理可能已经被垃圾回收的对象
        this._objTimeMap.forEach((timerSet, obj) => {
            if (!obj || timerSet.size === 0) {
                this._objTimeMap.delete(obj);
            }
        });
    }

    /**
     * 获取统计信息
     */
    public static getStats() {
        let activeTimerCount = 0;
        let current = this._timeList;
        while (current) {
            activeTimerCount++;
            current = current.next;
        }

        return {
            activeTimers: activeTimerCount,
            pendingTimers: this._pendingTimers.length,
            objectTimers: this._objTimeMap.size,
            isUpdating: this._isUpdating,
            hasActiveTimers: this._hasActiveTimers
        };
    }

    /**
     * 更新所有计时器
     */
    public static update() {
        if (!this._hasActiveTimers) return;

        this._isUpdating = true;
        const now = Date.now();
        let current: TimerItem | undefined = this._timeList;
        let prev: TimerItem | null = null;

        while (current) {
            if (current.duration <= 0 || now - current.curtime >= current.duration) {
                const nextNode = current.next;
                
                current.loopcall();
                current.loopcountcur++;

                if (current.loopcount > current.loopcountcur) {
                    current.curtime = now;
                    prev = current;
                    current = nextNode;
                } else {
                    current.endcall?.();
                    if (prev) {
                        prev.next = nextNode;
                    } else {
                        this._timeList = nextNode;
                    }
                    current = nextNode;
                }
            } else {
                prev = current;
                current = current.next;
            }
        }

        this._isUpdating = false;

        if (this._pendingTimers.length > 0) {
            for (const timer of this._pendingTimers) {
                timer.next = this._timeList || undefined;
                this._timeList = timer;
            }
            this._pendingTimers.length = 0;
        }

        this._hasActiveTimers = this._timeList !== undefined;
    }
}
