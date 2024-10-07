// make sure a sidecar is running, if it is not running, start it

import { Child, Command } from "@tauri-apps/api/shell";
import { join, appDataDir } from '@tauri-apps/api/path';
import { fs, shell } from '@tauri-apps/api';
import { arch, platform } from '@tauri-apps/api/os';
import { getBlockchainInfo } from "./wallet-utils";
import { CodeError, ErrorCode } from './error';
import { app } from '@tauri-apps/api';

async function strangeLog(m: string) {
    const appDataDirPath = await appDataDir();
    console.log("appDataDirPath:", appDataDirPath);
    const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
    await fs.writeFile(`${nodeDataDirPath}/strange.log`, m, { append: true });
}

export async function ensureBitbidIsRunning() {
    try {
        const appDataDirPath = await appDataDir();
        console.log("appDataDirPath:", appDataDirPath);
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            if (await isBitbidRunning(pid)) {
                console.log(`bitbid with pid ${pid} is running`)
                return;
            }
        }
        const pid2 = await getPid(`${nodeDataDirPath}/data/bitbid.pid`);
        if (pid2 && pid2 !== pid) {
            await strangeLog(`two pid isn't the same: ${pid} and ${pid2}`);
            if (await isBitbidRunning(pid2)) {
                console.log(`bitbid with pid2 ${pid} is running`)
                return;
            }
        }
        const child = await runBitbi(nodeDataDirPath);
        //write pid into bitbid.pid
        await fs.writeFile(`${nodeDataDirPath}/bitbid.pid`, child.pid.toString());
        //wait for child.pid process is running and no more than xx seconds
        let count = 0;
        while (count < 20) {
            await sleep(5 * 1000);
            count++;
            if (await isBitbidRunning(child.pid)) {
                console.log('wait bitbid after runBitbi:  running successfully')
                return;
            }
        }
        console.log('wait bitbid after runBitbi:  running failed')
        return;
    } catch (e) {
        console.log("ensureBitbidIsRunning error:", e);
        if (e instanceof CodeError) {
            throw e;
        }
    }
}


export async function ensureMinerdIsRunning(threads: number, addr: string) {
    try {
        const appDataDirPath = await appDataDir();
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            //if the process not running, 
            //we try to check it every 5 seconds for 3 times here
            let attempts = 0;
            while (attempts++ < 5) {
                if (await isProcessRunning(pid)) {
                    console.log('minerd is running')
                    return;
                }
                await sleep(3 * 1000);
            }
        }
        const child = await runMinerd(minerDir, threads, addr);
        //write pid into minerd.pid
        await fs.writeFile(`${minerDir}/minerd.pid`, child.pid.toString());
        return;
    } catch (e) {
        console.log("ensureMinerdIsRunning error:", e);
    }
}

async function killPid(pid: number) {
    console.log("killPid:", pid)
    const isWindows = (await platform()) === 'win32';
    if (isWindows) {
        //kill windows process
        const command = new Command("taskkill", ['/F', '/PID', pid.toString()], { encoding: "utf-8" });
        await command.execute();
    } else {
        const command = new Command("kill", ['-9', pid.toString()], { encoding: "utf-8" });
        await command.execute();
    }
}
export async function stopSidecar(name: string) {
    if (name === "bitbid") {
        const appDataDirPath = await appDataDir();
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            while (await isProcessRunning(pid)) {
                await killPid(pid);
                await sleep(1 * 1000);
            }
            console.log('bitbid stopped');
        }
        return;
    }
    if (name === 'minerd') {
        const appDataDirPath = await appDataDir();
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            while (await isProcessRunning(pid)) {
                await killPid(pid);
                await sleep(1 * 1000);
            }
            console.log('minerd stopped');
        }
        return;
    }
}

export async function isSidecarRunning(name: string) {
    if (name === "bitbid") {
        const appDataDirPath = await appDataDir();
        const nodeDataDirPath = await join(appDataDirPath, 'bitbid');
        const pid = await getPid(`${nodeDataDirPath}/bitbid.pid`);
        if (pid) {
            return await isProcessRunning(pid);
        }
        return false;
    }
    if (name === 'minerd') {
        const appDataDirPath = await appDataDir();
        const minerDir = await join(appDataDirPath, 'minerd');
        const pid = await getPid(`${minerDir}/minerd.pid`);
        if (pid) {
            return await isProcessRunning(pid);
        }
        return false;
    }
    return false;
}

async function runBitbi(nodeDataDirPath: string) {
    await fs.createDir(`${nodeDataDirPath}/data`, { recursive: true });
    console.log("runBitbi created folder:", `${nodeDataDirPath}/data`);
    //let's read a file contains the last time the node was started, 
    // if current time - last time < 5 minutes, then we need to delete the blocks and chainstates
    // and restart the node
    const now = Date.now();
    const nodeLogName = 'debug.log';
    let reindex = false;
    if (await fs.exists(`${nodeDataDirPath}/data/lastStartTime.txt`)) {
        const lastStartTime = parseInt(await fs.readTextFile(`${nodeDataDirPath}/data/lastStartTime.txt`)) || 1;
        if (now - lastStartTime < 5 * 60 * 1000) {
            reindex = true;
            //remove log
            if (await fs.exists(`${nodeDataDirPath}/data/${nodeLogName}`)) {
                await fs.renameFile(`${nodeDataDirPath}/data/${nodeLogName}`, `${nodeDataDirPath}/data/${nodeLogName}.${now}`);
            }
        }
    }

    //delete very old debug.log
    const files = await fs.readDir(`${nodeDataDirPath}/data`, { recursive: false });
    for (const file of files) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (file.name?.startsWith(`${nodeLogName}.`) && parseInt(file.name.slice(10)) < now - sevenDays) {
            await fs.removeFile(`${nodeDataDirPath}/data/${file.name}`);
        }
    }

    //write current time to lastStartTime.txt
    await fs.writeTextFile(`${nodeDataDirPath}/data/lastStartTime.txt`, now.toString());
    const command = Command.sidecar("sidecar/bitbid", [
        '-rpcuser=golden',
        `-rpcpassword=wallet`,
        `-datadir=${nodeDataDirPath}/data`,
        `-rpcworkqueue=32`,
        `-reindex=${reindex ? '1' : '0'}`,
    ], { encoding: "utf-8" });
    console.log("runBitbi begin spawn command");
    return await command.spawn();
}
function generateUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return shortenNumbers(timestamp) + shortenNumbers(random);
}

// Generate MinerId once when the module is loaded
const MinerId = generateUniqueId();

async function runMinerd(minerDir: string, threads: number, addr: string) {
    await fs.createDir(minerDir, { recursive: true });
    if (!addr) {
        console.error('miner address not found');
        throw new Error('miner address not found');
    }
    const archt = await arch();
    const platformt = await platform();
    const appVersion = await app.getVersion();
    const outLogFile = `${minerDir}/minerd.out.log`;
    const now = Date.now();
    const command = Command.sidecar("sidecar/minerd", [
        '--url=http://golden:wallet@127.0.0.1:9800',
        `--coinbase-sig=${archt}-${platformt}-v${appVersion}-${MinerId}${shortenNumbers(now).slice(-4)}`,
        `--coinbase-addr=${addr}`,
        `--threads=${threads}`,
    ], { env: { "PATH": "%PATH%;.\\resources" }, encoding: "utf-8" });
    const miner = await command.spawn();
    command.stdout.on('data', data => {
        console.log('stdout:', data);
        //write data to outLogFile
        fs.writeTextFile(outLogFile, data, { append: true });
    });

    command.stderr.on('data', data => {
        console.log('stderr:', data);
        //write data to errLogFile
        fs.writeTextFile(outLogFile, data, { append: true });
    });
    console.log(`runMinerd start mining on ${addr} with ${threads} threads`);
    return miner;
}

async function getPid(path: string) {
    try {
        const pid = await fs.readTextFile(path);
        console.log("getPid:", pid);
        return parseInt(pid.trim());
    } catch (e) {
        return null;
    }
}

// check if a process is running, 
async function isProcessRunning(pid: number) {
    const platformName = await platform();
    const isWindows = platformName === 'win32';
    console.log("isProcessRunning plaformName:", platformName, "; isWindows:", isWindows, "; pid:", pid);
    const command = isWindows ? ["tasklist", "/FI", `PID eq ${pid}`] : ['ps', '-p', `${pid}`];

    //exec command
    const output = await new Command(command[0], command.slice(1), { encoding: "utf-8" }).execute();
    console.log('isProcessRunning output:', output.stdout, output.stderr);
    console.log('isProcessRunning code:', output.code, "; signal", output.signal);
    return output.stdout.includes(pid.toString());
}

async function isBitbidRunning(pid: number) {
    if (await isProcessRunning(pid)) {
        return true;
    }
    const platformName = await platform();
    const isLinux = platformName === 'linux';
    if (!isLinux) {
        return false;
    }
    //if not windows, double check if there is a process with the pid,name,port using `ss`
    const BitbidPort = 9800;
    const output = await new Command("ss", ['-tlp', `sport = :${BitbidPort}`], { encoding: "utf-8" }).execute();
    console.log('isBitbidRunning output:', output.stdout, output.stderr);
    console.log('isBitbidRunning code:', output.code, "; signal", output.signal);
    const running = output.stdout.includes(pid.toString()) || output.stdout.includes('bitbid');
    if (running) {
        console.log('port 9800 is already opened');
        strangeLog(`port 9800 is already opened, but 'ps -p ${pid}' not found bitbid, and 'ss' found this: ${output.stdout}`);
        return true;
    }
    if (!running && output.stdout.includes(BitbidPort.toString())) {
        // There is other process that using 9800 port, throw error
        throw new CodeError(ErrorCode.PORT_ALREADY_IN_USE, 'There is other process that using port 9800 , please stop it first');
    }
    return running;
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function shortenNumbers(n: number) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let str = '';
    do {
        str = chars[n % chars.length] + str;
        n = Math.floor(n / chars.length);
    } while (n > 0);
    return str;
}

export async function checkIfNodeCaughtUp() {
    try {
        //check if the node is caught up
        const info = await getBlockchainInfo();
        return info.blocks === info.headers && !info.initialblockdownload;
    } catch (e) {
        console.error('checkIfNodeCaughtUp error:', e);
        return false;
    }
}


export function getShorter(address: string) {
    if (address.length > 26) {
        return address.slice(0, 10) + '......' + address.slice(-10);
    }
    return address;
}

export function formatUnixSec(sec: number) {
    const date = new Date(sec * 1000); // If the timestamp is in seconds, multiply by 1000 to convert it to milliseconds
    return date.toLocaleString(); // Adjust this to change the date format
}

export function formatNumber(num: number, frDigits: number = 2) {
    return num.toLocaleString('en-US', {
        maximumFractionDigits: frDigits,
    });
}

export function generateRandomBytes(bytesCount: number = 32) {
    const array = new Uint8Array(bytesCount);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
        for (let i = 0; i < bytesCount; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }   
    return array;
}

export function uint8ArrayToHex(array: Uint8Array) {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function stringToHex(str: string) {
    return uint8ArrayToHex(new TextEncoder().encode(str));
}

export function hexToString(hex: string) {
    return new TextDecoder().decode(new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));
}
