#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

class WarmAionSaturationAudioProcessorEditor  : public juce::AudioProcessorEditor,
                                               private juce::Timer
{
public:
    WarmAionSaturationAudioProcessorEditor (WarmAionSaturationAudioProcessor&);
    ~WarmAionSaturationAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

    void timerCallback() override;

private:
    WarmAionSaturationAudioProcessor& audioProcessor;

    juce::Slider driveSlider;
    juce::Slider cutoffSlider;
    juce::Slider toneSlider;
    juce::Slider biasSlider;
    juce::Slider widthSlider;
    juce::Slider reverbSlider;
    juce::Slider duckSlider;
    juce::Slider mixSlider;

    juce::ComboBox presetComboBox;
    juce::ComboBox modelComboBox;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> driveAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> cutoffAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> toneAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> biasAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> widthAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> reverbAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> duckAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> mixAttachment;

    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> presetAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment> modelAttachment;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WarmAionSaturationAudioProcessorEditor)
};
