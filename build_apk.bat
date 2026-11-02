@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "D:\ARY Services\mobile\customer\android"
call gradlew.bat assembleDebug
