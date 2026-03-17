#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HealthKitBridge, NSObject)

RCT_EXTERN_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchBiometrics:(NSString *)startDateIso
                  endDateIso:(NSString *)endDateIso
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchWorkouts:(NSString *)startDateIso
                  endDateIso:(NSString *)endDateIso
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
