#ifndef HARDWARE_CONFIG_H
#define HARDWARE_CONFIG_H

// TFT Display Configuration (ST7735 128x128 RGB)
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <SPI.h>

// TFT Display Pins
#define TFT_CS    5   // Chip Select
#define TFT_RST   22  // Reset
#define TFT_DC    21  // Data/Command
#define TFT_MOSI  23  // MOSI (SDA)
#define TFT_SCLK  18  // Clock (SCK)
#define TFT_BL    3.3 // Backlight (3.3V)

// Button Pins (with internal pullup, default state HIGH)
// Note: Use GPIOs that support internal pull-ups; GPIO35 does not.
// If hardware was previously wired to 35, move the Up button to GPIO27.
#define BUTTON_UP    27  // Up navigation (moved from 35 to support internal pull-up)
#define BUTTON_ENTER 32  // Enter/Select
#define BUTTON_DOWN  33  // Down navigation

// LED Pins
#define LED_YELLOW 2   // Device on/standby indicator (D2)
#define LED_BLUE   15  // Active scanning indicator (D15)

// Display Colors (16-bit RGB565)
#define COLOR_BLACK    0x0000
#define COLOR_WHITE    0xFFFF
#define COLOR_RED      0xF800
#define COLOR_GREEN    0x07E0
#define COLOR_BLUE     0x001F
#define COLOR_YELLOW   0xFFE0
#define COLOR_CYAN     0x07FF
#define COLOR_MAGENTA  0xF81F
#define COLOR_ORANGE   0xFC00
#define COLOR_PURPLE   0x780F
#define COLOR_PINK     0xF81F

// Display Layout (Landscape orientation - width and height are swapped)
#define SCREEN_WIDTH   128
#define SCREEN_HEIGHT  128
#define FONT_SIZE      1
#define LINE_HEIGHT    12
#define MAX_MENU_ITEMS 6

// Button States (with internal pullup)
#define BUTTON_PRESSED     LOW
#define BUTTON_RELEASED    HIGH

// LED States
#define LED_ON     HIGH
#define LED_OFF    LOW

// Display Text Positions (Landscape layout)
#define TITLE_Y        8
#define MENU_START_Y   25
#define STATUS_Y       120
#define LEFT_MARGIN    5
#define RIGHT_MARGIN   5

// System Configuration
#define MAX_EVENTS 10
#define SCAN_INTERVAL 5000  // 5 seconds
#define BLE_SCAN_DURATION 1500  // 1.5 seconds for snappier stop response

#endif // HARDWARE_CONFIG_H