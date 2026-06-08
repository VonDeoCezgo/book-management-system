@echo off
set "JAVA_HOME=%USERPROFILE%\.jdks\openjdk-24.0.2+12-54"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6"
"%JAVA_HOME%\bin\java" -classpath "%~dp0.mvn\wrapper\maven-wrapper.jar" org.apache.maven.wrapper.MavenWrapperMain %*
