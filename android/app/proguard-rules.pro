# ProGuard & R8 Configuration for Arcade Vault Android V2
# Capacitor Core WebView Bridge rules
-keep public class com.getcapacitor.** { *; }
-keepclassmembers class * implements com.getcapacitor.Plugin {
   public <methods>;
}
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepattributes SourceFile,LineNumberTable
