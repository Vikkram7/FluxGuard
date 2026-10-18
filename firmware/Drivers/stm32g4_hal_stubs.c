/**
 * @file stm32g4_hal_stubs.c
 * @brief FluxGuard PMSM - STM32G4 Hardware Abstraction Layer Implementation
 */

#include "stm32g4_hal_stubs.h"
#include <string.h>

#if defined(STM32G474xx)
/* On actual target: include official ST HAL headers */
#include "stm32g4xx_hal.h"
extern ADC_HandleTypeDef hadc1;
extern TIM_HandleTypeDef htim2;
extern UART_HandleTypeDef huart1;
extern IWDG_HandleTypeDef hiwdg;

void HAL_Driver_Init(STM32G4_Hardware_t *hw) {
    HAL_Init();
    SystemClock_Config();
    MX_GPIO_Init();
    MX_DMA_Init();
    MX_ADC1_Init();
    MX_TIM1_Init();
    MX_TIM2_Init();
    MX_USART1_UART_Init();
    MX_IWDG_Init();
}

void HAL_Driver_StartADC_DMA(STM32G4_Hardware_t *hw) {
    HAL_ADC_Start_DMA(&hadc1, (uint32_t*)hw->adc1_dma_buffer, 4);
}

void HAL_Driver_StartEncoder(STM32G4_Hardware_t *hw) {
    HAL_TIM_Encoder_Start(&htim2, TIM_CHANNEL_ALL);
}

void HAL_Driver_TransmitUART_DMA(STM32G4_Hardware_t *hw, const uint8_t *data, uint16_t length) {
    HAL_UART_Transmit_DMA(&huart1, data, length);
}

void HAL_Driver_KickWatchdog(STM32G4_Hardware_t *hw) {
    HAL_IWDG_Refresh(&hiwdg);
}

uint32_t HAL_Driver_GetTick(void) {
    return HAL_GetTick();
}

#else
/* Host simulation stub implementation */
static uint32_t host_tick_ms = 0;

void HAL_Driver_Init(STM32G4_Hardware_t *hw) {
    if (!hw) return;
    memset(hw->adc1_dma_buffer, 0, sizeof(hw->adc1_dma_buffer));
    hw->adc1_dma_buffer[0] = 2048; /* ia zero offset */
    hw->adc1_dma_buffer[1] = 2048; /* ib zero offset */
    hw->adc1_dma_buffer[2] = 2200; /* ~48V vbus */
    hw->adc1_dma_buffer[3] = 1200; /* ~25C temp */
    hw->encoder_timer_val = 0;
    hw->watchdog_active = true;
    hw->uart_tx_busy = false;
}

void HAL_Driver_StartADC_DMA(STM32G4_Hardware_t *hw) {
    /* Continuous circular DMA active */
}

void HAL_Driver_StartEncoder(STM32G4_Hardware_t *hw) {
    /* Timer encoder mode active */
}

void HAL_Driver_TransmitUART_DMA(STM32G4_Hardware_t *hw, const uint8_t *data, uint16_t length) {
    /* Simulated non-blocking DMA transmission */
    if (hw) hw->uart_tx_busy = false;
}

void HAL_Driver_KickWatchdog(STM32G4_Hardware_t *hw) {
    if (hw) hw->watchdog_active = true;
}

uint32_t HAL_Driver_GetTick(void) {
    host_tick_ms += 10;
    return host_tick_ms;
}
#endif
