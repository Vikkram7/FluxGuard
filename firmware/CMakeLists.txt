cmake_minimum_required(VERSION 3.20)
project(FluxGuard_Firmware C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/Configuration
    ${CMAKE_CURRENT_SOURCE_DIR}/Drivers
    ${CMAKE_CURRENT_SOURCE_DIR}/Sensors
    ${CMAKE_CURRENT_SOURCE_DIR}/Estimator
    ${CMAKE_CURRENT_SOURCE_DIR}/Diagnostics
    ${CMAKE_CURRENT_SOURCE_DIR}/Communication
)

# Common library for firmware logic
add_library(fluxguard_core STATIC
    Estimator/flux_estimator.c
    Diagnostics/diagnostic_state_machine.c
    Sensors/sensor_manager.c
    Communication/telemetry_packet.c
    Drivers/stm32g4_hal_stubs.c
)

# Host Test Executable
add_executable(test_firmware_core
    Tests/test_firmware_core.c
)
target_link_libraries(test_firmware_core PRIVATE fluxguard_core)

# Firmware entry executable
add_executable(fluxguard_firmware_app
    Core/main.c
)
target_link_libraries(fluxguard_firmware_app PRIVATE fluxguard_core)
