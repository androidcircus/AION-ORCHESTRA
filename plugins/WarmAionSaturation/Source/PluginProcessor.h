#pragma once

#include <JuceHeader.h>

class WarmAionSaturationAudioProcessor : public juce::AudioProcessor
{
public:
    WarmAionSaturationAudioProcessor();
    ~WarmAionSaturationAudioProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;

    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int index, const juce::String& newName) override;

    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    juce::AudioProcessorValueTreeState apvts;

private:
    juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    // DSP components
    std::unique_ptr<juce::dsp::Oversampling<float>> oversampler;
    juce::Reverb reverb;
    juce::dsp::Limiter<float> limiter;

    // For Visualizer
    juce::AudioBuffer<float> visualizerBuffer;

    float lastSampleL = 0.0f;
    float lastSampleR = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (WarmAionSaturationAudioProcessor)
};
