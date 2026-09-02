cmake_minimum_required(VERSION 3.15)

project(WarmAionSaturation VERSION 0.1.0)

# If JUCE is not already added to the project, you can use FetchContent or point to a local path
# For now, we assume JUCE is available in the system or as a sibling directory
# find_package(JUCE CONFIG REQUIRED)

# Alternatively, a simple way to start is to use the JUCE framework if added as a submodule
# add_subdirectory(JUCE)

juce_add_plugin(WarmAionSaturation
    COMPANY_NAME "MELODYCRAFT"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE Mldy
    PLUGIN_CODE Warm
    FORMATS VST3 AU
    PRODUCT_NAME "MelodyCraft Warmth")

target_sources(WarmAionSaturation
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginProcessor.h
        Source/PluginEditor.cpp
        Source/PluginEditor.h)

target_compile_definitions(WarmAionSaturation
    PUBLIC
        # JUCE_WEB_BROWSER=0  # Example definitions
        JUCE_USE_CURL=0
        JUCE_VST3_CAN_REPLACE_VST2=0)

target_link_libraries(WarmAionSaturation
    PRIVATE
        juce::juce_audio_utils
        juce::juce_audio_processors
        juce::juce_audio_formats
        juce::juce_audio_basics
        juce::juce_dsp
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
        juce::juce_events
        juce::juce_core)
