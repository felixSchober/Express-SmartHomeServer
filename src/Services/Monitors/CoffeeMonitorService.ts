import { IMonitorService } from '../../Interfaces/IMonitorService';
import { IPowerControllerService } from '../../Interfaces/Devices/Power/IPowerControllerService';
import { Moment } from 'moment';
import * as moment from 'moment';
import { ICoffeeStats } from '../../Interfaces/ICoffeeStat';
import {coffeeConfig} from '../../config/coffee';
import { ITuple } from '../../Interfaces/ITuple';
import { Helpers } from '../../Helpers';
import { Options } from 'request';
import { IRequestResponse } from '../../Interfaces/IRequestResponse';




export class CoffeeMonitorService implements IMonitorService {
    
    private espressoTimeThreshold = 6;

    private powerService: IPowerControllerService;
    private plugName: string;
    private lastEspressoTime: Moment;
    private cachedCoffeeStats: ICoffeeStats;

    constructor(powerService: IPowerControllerService, plugName?: string) {
        this.powerService = powerService;
        this.plugName = plugName || coffeeConfig.plugName;
        this.lastEspressoTime = moment().subtract(10, 'years');
        this.cachedCoffeeStats = {
            today: -1,
            total: -1,
            week: -1
        };
    }

    start(): Promise<ICoffeeStats> {
        return new Promise<ICoffeeStats>((resolve, reject) => {
            this.triggerEspressoCountApp()
            .then((initialResponse: ICoffeeStats) => {
                
                this.cachedCoffeeStats = this.ensureIntegerResponse(initialResponse);
                resolve(this.cachedCoffeeStats );
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    run(): Promise<ICoffeeStats> {
        return new Promise<ICoffeeStats>((resolve, reject) => {
            this.checkIfNewEspressoHasBeenCreated(false)
                .then((wasCreated: boolean) => {
                    if(!wasCreated) {
                        resolve(this.cachedCoffeeStats);
                        return;
                    }

                    this.lastEspressoTime = moment();
                    // espresso was created
                    // trigger flow
                    this.triggerEspressoFlow()
                        .then((newEspressoValue) => {
                            this.cachedCoffeeStats.today = +newEspressoValue;
                            this.cachedCoffeeStats.total += 1;
                            this.cachedCoffeeStats.week += 1;
                            console.log('[Coffee]:\trun() Updated coffee number after logic app triggering: ' + newEspressoValue);
                            resolve(this.cachedCoffeeStats);
                        })
                        .catch((error) => {
                            const errorMessage = `[Coffee]: \trun() Could not trigger Logic App: ${JSON.stringify(error)}`;
                            console.error(errorMessage);
                            reject(errorMessage);
                        });
                })
                .catch((error) => {
                    const errorMessage = `[Coffee]: \trun() Could not check if new espresso was created: ${JSON.stringify(error)}`;
                    console.error(errorMessage);
                    reject(errorMessage);
                });
        });
    }

    private triggerEspressoCountApp(): Promise<ICoffeeStats> {
        const options: Options = {
            url: coffeeConfig.countEspressoAppUrl,
            method: 'GET'
        };

        return new Promise<ICoffeeStats>((resolve, reject) => {
            Helpers.performRequest(options, '[Coffee]', false, true)
                .then((value: IRequestResponse) => {
                    console.log(`[Coffee]: \triggerEspressoCountApp() Intial state Response: ${JSON.stringify(value)}`);
                    resolve(value.data as ICoffeeStats);
                })
                .catch((error) => {
                    const errorMessage = `[Coffee]: \triggerEspressoCountApp() Unexpected HTTP error. Error: ${JSON.stringify(error)}`;
                    console.error(errorMessage);
                    reject(errorMessage);
                });
        });
    }

    private triggerEspressoFlow(): Promise<number> {
        const requestBody: any = {
            time: moment().format(),
            type: 1,
            key: coffeeConfig.key,
            id: Helpers.newGuid()
        };
        const options: Options = {
            uri: coffeeConfig.newEspressoAppUrl,
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'content-type': 'application/json'
            }
        };

        return new Promise<number>((resolve, reject) => {
            Helpers.performRequest(options, '[Coffee]', false, true)
                .then((value: IRequestResponse) => {
                    if (value.status === 401) {
                        const errorMessage = `[Coffee]: \ttriggerEspressoFlow() Logic App auth key (${coffeeConfig.key}) was not correct. Response: ${JSON.stringify(value)}`;
                        console.error(errorMessage);
                        reject(errorMessage);
                        return;
                    } else if (value.status !== 201) {
                        const errorMessage = `[Coffee]: \ttriggerEspressoFlow() Unexpected HTTP status code ${value.status}. Response: ${JSON.stringify(value)}`;
                        console.error(errorMessage);
                        reject(errorMessage);
                    } else {
                        console.log(`[Coffee]: \ttriggerEspressoFlow() Logic App trigger successful. Response: ${JSON.stringify(value)}`);
                        resolve(value.data as number);
                    }
                })
                .catch((error) => {
                    const errorMessage = `[Coffee]: \ttriggerEspressoFlow() Unexpected HTTP error. Error: ${JSON.stringify(error)}`;
                    console.error(errorMessage);
                    reject(errorMessage);
                });
        });
    }

    private checkIfNewEspressoHasBeenCreated(liveUpdate: boolean, degugVerbose?: boolean): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            
            // if the time difference between the last coffee is too short, don't add it
            if (!this.isWithinTimeFrame()) {
                if (degugVerbose) console.log(`[Coffee]: \tNot within refresh timeframe`);
                resolve(false);
                return;
            }

            // check current (cached) powerstate
            if (!liveUpdate) {
                if (degugVerbose) console.log(`[Coffee]: \tUse cached power states to check if coffee`);

                const plugPower = this.powerService.getCachedPowerForPlug(this.plugName);
                if (plugPower > coffeeConfig.powerThreshold) {
                    if (degugVerbose) console.log(`[Coffee]: \tAbove power threshold (${plugPower}W > ${coffeeConfig.powerThreshold}W)`);

                    console.log('[Coffee]: \tcheckIfNewEspressoHasBeenCreated(' + liveUpdate + '):\tDetected new Coffee. Current Power: ' + plugPower);
                    resolve(true);
                } else {
                    if (degugVerbose) console.log(`[Coffee]: \tBelow power threshold (${plugPower}W <= ${coffeeConfig.powerThreshold}W)`);

                    resolve(false);
                }
            } else {
                this.powerService
                    .getLivePowerForPlug(this.plugName)
                    .then((plugPowerResult: ITuple<string, number>) => {
                        if (plugPowerResult.obj2 > coffeeConfig.powerThreshold) {
                            console.log('[Coffee]: \tcheckIfNewEspressoHasBeenCreated(' + liveUpdate + '):\tDetected new Coffee. Current Power: ' + plugPowerResult.obj2);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                    .catch((error) => {
                        const errorMessage = '[Coffee]: \tcheckIfNewEspressoHasBeenCreated(' + liveUpdate + ') - Could not get power levels for plug. Error: ' + JSON.stringify(error);
                        console.error(errorMessage);
                        reject(errorMessage);
                    });
            }
        });
    }

    private isWithinTimeFrame(): boolean {
        const now = moment();
        const timeDiff = now.diff(this.lastEspressoTime, 'minutes');
        return !(timeDiff < this.espressoTimeThreshold);
    }

    private ensureIntegerResponse(s: ICoffeeStats): ICoffeeStats {
        s.today = +s.today;
        s.week = +s.week;
        s.total = +s.total;
        return s;
    }
    

    

}