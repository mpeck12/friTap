
import {OpenSSL_BoringSSL } from "../ssl_lib/openssl_boringssl.js"
import { socket_library } from "./ios_agent.js";
import { log, devlog } from "../util/log.js"

export class OpenSSL_BoringSSL_iOS extends OpenSSL_BoringSSL {

    install_tls_keys_callback_hook(){
        //console.log(this.addresses) // currently only for debugging purposes will be removed in future releases
        if (ObjC.available) { // inspired from https://codeshare.frida.re/@andydavies/ios-tls-keylogger/
            var CALLBACK_OFFSET = 0x2A8;

            var foundationNumber = Module.findExportByName('CoreFoundation', 'kCFCoreFoundationVersionNumber')?.readDouble();
            if(foundationNumber == undefined){
                devlog("Installing callback for iOS < 14");
                CALLBACK_OFFSET = 0x2A8;
            } else if (foundationNumber >= 1751.108 && foundationNumber < 1946.102) {
                devlog("Installing callback for iOS >= 14");
                CALLBACK_OFFSET = 0x2B8; // >= iOS 14.x 
            } else if (foundationNumber >= 1946.102 && foundationNumber <= 1979.1) {
                devlog("Installing callback for iOS >= 16");
                CALLBACK_OFFSET = 0x300; // >= iOS 16.x 
            } else if (foundationNumber > 1979.1) {
                devlog("Installing callback for iOS >= 17");
                CALLBACK_OFFSET = 0x308; // >= iOS 17.x 
            }
            Interceptor.attach(this.addresses["SSL_CTX_set_info_callback"], {
              onEnter: function (args : any) {
                ptr(args[0]).add(CALLBACK_OFFSET).writePointer(OpenSSL_BoringSSL.keylog_callback);
              }
            });
          
          }

    }


    constructor(public moduleName:String, public socket_library:String){

        var library_method_mapping: { [key: string]: Array<String> } = {}

        // the iOS implementation needs some further improvements - currently we are not able to get the sockfd from an SSL_read/write invocation
        library_method_mapping[`*${moduleName}*`] = ["SSL_read", "SSL_write", "BIO_get_fd", "SSL_get_session", "SSL_SESSION_get_id", "SSL_new", "SSL_CTX_set_info_callback"]
        library_method_mapping[`*${socket_library}*`] = ["getpeername*", "getsockname*", "ntohs*", "ntohl*"] // currently those functions gets only identified if we at an asterisk at the end 

        super(moduleName,socket_library,library_method_mapping);
    }

    execute_hooks(){

        /*
        currently these function hooks aren't implemented
        this.install_plaintext_read_hook();
        this.install_plaintext_write_hook();
        */

        this.install_tls_keys_callback_hook();
    }

    

}


export function boring_execute(moduleName:String){
    var boring_ssl = new OpenSSL_BoringSSL_iOS(moduleName,socket_library);
    boring_ssl.execute_hooks();


}