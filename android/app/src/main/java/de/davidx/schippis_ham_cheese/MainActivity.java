package de.davidx.schippis_ham_cheese;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GnssBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
